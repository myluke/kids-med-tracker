import { z } from 'zod'
import type { ServiceContext } from './types'
import { ServiceError, ErrorCode } from '../errors/service-error'
import { checkFamilyMembership } from '../lib/supabase'

// ============ Zod Schemas ============

export const recordTypeSchema = z.enum(['med', 'cough', 'temp', 'note'])

export const listRecordsInputSchema = z.object({
  familyId: z.string().uuid(),
  childId: z.string().uuid().optional(),
  since: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(500).default(200),
})

export const createRecordInputSchema = z.object({
  familyId: z.string().uuid(),
  childId: z.string().uuid(),
  type: recordTypeSchema,
  time: z.string().min(1),
  payload: z.unknown().optional(),
})

export const updateRecordInputSchema = z.object({
  recordId: z.string().uuid(),
  familyId: z.string().uuid(),
  payload: z.unknown(),
})

export const deleteRecordInputSchema = z.object({
  recordId: z.string().uuid(),
  familyId: z.string().uuid(),
})

// ============ 类型定义 ============

export type ListRecordsInput = z.infer<typeof listRecordsInputSchema>
export type CreateRecordInput = z.infer<typeof createRecordInputSchema>
export type UpdateRecordInput = z.infer<typeof updateRecordInputSchema>
export type DeleteRecordInput = z.infer<typeof deleteRecordInputSchema>

export interface RecordDto {
  id: string
  childId: string
  type: string
  time: string
  payloadJson: unknown
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

// ============ 服务函数 ============

/**
 * 获取记录列表
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 403 如果用户不是家庭成员
 * @throws ServiceError 500 数据库错误
 */
export async function listRecords(
  ctx: ServiceContext,
  input: ListRecordsInput
): Promise<RecordDto[]> {
  const parsed = listRecordsInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { familyId, childId, since, limit } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  let query = ctx.db
    .from('records')
    .select('id, child_id, type, time, payload_json, created_by_user_id, created_at, updated_at')
    .eq('family_id', familyId)
    .is('deleted_at', null)
    .order('time', { ascending: false })
    .limit(limit)

  if (childId) {
    query = query.eq('child_id', childId)
  }

  if (since) {
    query = query.gt('updated_at', since)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch records:', error)
    throw ServiceError.dbError('Failed to fetch records')
  }

  return (data || []).map(r => ({
    id: r.id,
    childId: r.child_id,
    type: r.type,
    time: r.time,
    payloadJson: r.payload_json,
    createdByUserId: r.created_by_user_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

/**
 * 创建记录
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 403 不是家庭成员
 * @throws ServiceError 500 数据库错误
 */
export async function createRecord(
  ctx: ServiceContext,
  input: CreateRecordInput
): Promise<{ id: string }> {
  const parsed = createRecordInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { familyId, childId, type, time, payload } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  const payloadJson = JSON.stringify(payload ?? null)

  const { data: record, error } = await ctx.db
    .from('records')
    .insert({
      family_id: familyId,
      child_id: childId,
      type,
      time,
      payload_json: payloadJson,
      created_by_user_id: ctx.user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create record:', error)
    throw ServiceError.dbError('Failed to create record')
  }

  return { id: record.id }
}

/**
 * 更新记录
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 403 无权编辑（非成员或非所有者且非创建者）
 * @throws ServiceError 500 数据库错误
 */
export async function updateRecord(
  ctx: ServiceContext,
  input: UpdateRecordInput
): Promise<{ updated: boolean }> {
  const parsed = updateRecordInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { recordId, familyId, payload } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  const payloadJson = JSON.stringify(payload ?? null)
  const now = new Date().toISOString()

  let query = ctx.db
    .from('records')
    .update({ payload_json: payloadJson, updated_at: now })
    .eq('id', recordId)
    .eq('family_id', familyId)
    .is('deleted_at', null)

  // 非 owner 只能编辑自己创建的记录
  if (role !== 'owner') {
    query = query.eq('created_by_user_id', ctx.user.id)
  }

  const { error, count } = await query

  if (error) {
    console.error('Failed to update record:', error)
    throw ServiceError.dbError('Failed to update record')
  }

  if (count === 0) {
    throw new ServiceError(403, ErrorCode.RECORD_NOT_EDITABLE, 'Record not editable')
  }

  return { updated: true }
}

/**
 * 删除记录（软删除）
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 403 无权删除
 * @throws ServiceError 500 数据库错误
 */
export async function deleteRecord(
  ctx: ServiceContext,
  input: DeleteRecordInput
): Promise<{ deleted: boolean }> {
  const parsed = deleteRecordInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { recordId, familyId } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  const now = new Date().toISOString()

  let query = ctx.db
    .from('records')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', recordId)
    .eq('family_id', familyId)
    .is('deleted_at', null)

  // 非 owner 只能删除自己创建的记录
  if (role !== 'owner') {
    query = query.eq('created_by_user_id', ctx.user.id)
  }

  const { error, count } = await query

  if (error) {
    console.error('Failed to delete record:', error)
    throw ServiceError.dbError('Failed to delete record')
  }

  if (count === 0) {
    throw new ServiceError(403, ErrorCode.RECORD_NOT_EDITABLE, 'Record not deletable')
  }

  return { deleted: true }
}
