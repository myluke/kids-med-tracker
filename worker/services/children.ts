import { z } from 'zod'
import type { ServiceContext } from './types'
import { ServiceError } from '../errors/service-error'
import { checkFamilyMembership } from '../lib/supabase'

// ============ Zod Schemas ============

export const listChildrenInputSchema = z.object({
  familyId: z.string().min(1),
})

export const createChildInputSchema = z.object({
  familyId: z.string().min(1),
  name: z.string().trim().min(1).max(50),
  emoji: z.string().trim().optional(),
  color: z.string().trim().optional(),
  gender: z.enum(['boy', 'girl']).optional(),
  age: z.string().trim().optional(),
})

export const updateChildInputSchema = z.object({
  childId: z.string().min(1),
  familyId: z.string().min(1),
  name: z.string().trim().min(1).max(50).optional(),
  emoji: z.string().trim().optional(),
  color: z.string().trim().optional(),
  gender: z.enum(['boy', 'girl']).optional(),
  age: z.string().trim().optional(),
})

export const deleteChildInputSchema = z.object({
  childId: z.string().min(1),
  familyId: z.string().min(1),
})

// ============ 类型定义 ============

export type ListChildrenInput = z.infer<typeof listChildrenInputSchema>
export type CreateChildInput = z.infer<typeof createChildInputSchema>
export type UpdateChildInput = z.infer<typeof updateChildInputSchema>
export type DeleteChildInput = z.infer<typeof deleteChildInputSchema>

export interface ChildDto {
  id: string
  name: string
  emoji: string | null
  color: string | null
  gender: string | null
  age: string | null
}

// ============ 服务函数 ============

/**
 * 获取孩子列表
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 403 不是家庭成员
 * @throws ServiceError 500 数据库错误
 */
export async function listChildren(
  ctx: ServiceContext,
  input: ListChildrenInput
): Promise<ChildDto[]> {
  const parsed = listChildrenInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }

  const role = await checkFamilyMembership(ctx.db, parsed.data.familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  const { data, error } = await ctx.db
    .from('children')
    .select('id, name, emoji, color, gender, age')
    .eq('family_id', parsed.data.familyId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch children:', error)
    throw ServiceError.dbError('Failed to fetch children')
  }

  return data || []
}

/**
 * 创建孩子
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 403 不是家庭 owner
 * @throws ServiceError 500 数据库错误
 */
export async function createChild(
  ctx: ServiceContext,
  input: CreateChildInput
): Promise<ChildDto> {
  const parsed = createChildInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }

  const role = await checkFamilyMembership(ctx.db, parsed.data.familyId, ctx.user.id)
  if (role !== 'owner') {
    throw ServiceError.notFamilyOwner()
  }

  const { data: child, error } = await ctx.db
    .from('children')
    .insert({
      family_id: parsed.data.familyId,
      name: parsed.data.name,
      emoji: parsed.data.emoji || null,
      color: parsed.data.color || null,
      gender: parsed.data.gender || null,
      age: parsed.data.age || null,
    })
    .select('id, name, emoji, color, gender, age')
    .single()

  if (error) {
    console.error('Failed to create child:', error)
    throw ServiceError.dbError('Failed to create child')
  }

  return child
}

/**
 * 更新孩子
 * @throws ServiceError 400 输入验证失败或无字段更新
 * @throws ServiceError 403 不是家庭 owner
 * @throws ServiceError 404 孩子不存在
 * @throws ServiceError 500 数据库错误
 */
export async function updateChild(
  ctx: ServiceContext,
  input: UpdateChildInput
): Promise<{ updated: boolean }> {
  const parsed = updateChildInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { childId, familyId, ...fields } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (role !== 'owner') {
    throw ServiceError.notFamilyOwner()
  }

  const updateData: Record<string, string | null> = {}
  if (typeof fields.name === 'string') updateData.name = fields.name
  if (typeof fields.emoji === 'string') updateData.emoji = fields.emoji
  if (typeof fields.color === 'string') updateData.color = fields.color
  if (typeof fields.gender === 'string') updateData.gender = fields.gender
  if (typeof fields.age === 'string') updateData.age = fields.age

  if (Object.keys(updateData).length === 0) {
    throw ServiceError.badRequest('No fields to update')
  }

  const { error, count } = await ctx.db
    .from('children')
    .update(updateData)
    .eq('id', childId)
    .eq('family_id', familyId)

  if (error) {
    console.error('Failed to update child:', error)
    throw ServiceError.dbError('Failed to update child')
  }

  if (count === 0) {
    throw ServiceError.notFound('Child')
  }

  return { updated: true }
}

/**
 * 删除孩子
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 403 不是家庭 owner
 * @throws ServiceError 404 孩子不存在
 * @throws ServiceError 500 数据库错误
 */
export async function deleteChild(
  ctx: ServiceContext,
  input: DeleteChildInput
): Promise<{ deleted: boolean }> {
  const parsed = deleteChildInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }

  const role = await checkFamilyMembership(ctx.db, parsed.data.familyId, ctx.user.id)
  if (role !== 'owner') {
    throw ServiceError.notFamilyOwner()
  }

  const { error, count } = await ctx.db
    .from('children')
    .delete()
    .eq('id', parsed.data.childId)
    .eq('family_id', parsed.data.familyId)

  if (error) {
    console.error('Failed to delete child:', error)
    throw ServiceError.dbError('Failed to delete child')
  }

  if (count === 0) {
    throw ServiceError.notFound('Child')
  }

  return { deleted: true }
}
