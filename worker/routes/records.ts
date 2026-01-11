import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createServiceClient, checkFamilyMembership } from '../lib/supabase'

const recordTypeSchema = z.enum(['med', 'cough', 'temp', 'note'])

const createRecordSchema = z.object({
  familyId: z.string().min(1),
  childId: z.string().min(1),
  type: recordTypeSchema,
  time: z.string().min(1),
  payload: z.unknown()
})

const updateRecordSchema = z.object({
  familyId: z.string().min(1),
  payload: z.unknown()
})

const records = new Hono<AppEnv>()

records.get('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const familyId = c.req.query('familyId')
  if (!familyId) return fail(c, 400, 'BAD_REQUEST', 'Missing familyId')

  const childId = c.req.query('childId') ?? undefined
  const since = c.req.query('since') ?? undefined
  const limitRaw = c.req.query('limit')
  const limit = Math.min(500, Math.max(1, Number(limitRaw ?? 200) || 200))

  const serviceClient = createServiceClient(c.env)

  // 检查用户是否是家庭成员
  const role = await checkFamilyMembership(serviceClient, familyId, user.id)
  if (!role) {
    return fail(c, 403, 'FORBIDDEN', 'Not a family member')
  }

  let query = serviceClient
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
    return fail(c, 500, 'DB_ERROR', 'Failed to fetch records')
  }

  // 转换字段名为驼峰格式
  const results = (data || []).map(r => ({
    id: r.id,
    childId: r.child_id,
    type: r.type,
    time: r.time,
    payloadJson: r.payload_json,
    createdByUserId: r.created_by_user_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }))

  return ok(c, results)
})

records.post('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = createRecordSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const serviceClient = createServiceClient(c.env)

  // 检查用户是否是家庭成员
  const role = await checkFamilyMembership(serviceClient, parsed.data.familyId, user.id)
  if (!role) {
    return fail(c, 403, 'FORBIDDEN', 'Not a family member')
  }

  const payloadJson = JSON.stringify(parsed.data.payload ?? null)

  const { data: record, error } = await serviceClient
    .from('records')
    .insert({
      family_id: parsed.data.familyId,
      child_id: parsed.data.childId,
      type: parsed.data.type,
      time: parsed.data.time,
      payload_json: payloadJson,
      created_by_user_id: user.id
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create record:', error)
    return fail(c, 500, 'DB_ERROR', 'Failed to create record')
  }

  return ok(c, { id: record.id }, 201)
})

records.patch('/:id', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const recordId = c.req.param('id')
  const json = await c.req.json().catch(() => null)
  const parsed = updateRecordSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const serviceClient = createServiceClient(c.env)

  // 检查用户角色
  const role = await checkFamilyMembership(serviceClient, parsed.data.familyId, user.id)
  if (!role) {
    return fail(c, 403, 'FORBIDDEN', 'Not a family member')
  }

  const payloadJson = JSON.stringify(parsed.data.payload ?? null)
  const now = new Date().toISOString()

  // owner 可以编辑所有，member 只能编辑自己的
  let query = serviceClient
    .from('records')
    .update({ payload_json: payloadJson, updated_at: now })
    .eq('id', recordId)
    .eq('family_id', parsed.data.familyId)
    .is('deleted_at', null)

  // 如果不是 owner，只能编辑自己创建的记录
  if (role !== 'owner') {
    query = query.eq('created_by_user_id', user.id)
  }

  const { error, count } = await query

  if (error) {
    console.error('Failed to update record:', error)
    return fail(c, 500, 'DB_ERROR', 'Failed to update record')
  }

  if (count === 0) {
    return fail(c, 403, 'FORBIDDEN', 'Record not editable')
  }

  return ok(c, { updated: true })
})

records.delete('/:id', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const recordId = c.req.param('id')
  const familyId = c.req.query('familyId')
  if (!familyId) return fail(c, 400, 'BAD_REQUEST', 'Missing familyId')

  const serviceClient = createServiceClient(c.env)

  // 检查用户角色
  const role = await checkFamilyMembership(serviceClient, familyId, user.id)
  if (!role) {
    return fail(c, 403, 'FORBIDDEN', 'Not a family member')
  }

  const now = new Date().toISOString()

  // 软删除
  let query = serviceClient
    .from('records')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', recordId)
    .eq('family_id', familyId)
    .is('deleted_at', null)

  // 如果不是 owner，只能删除自己创建的记录
  if (role !== 'owner') {
    query = query.eq('created_by_user_id', user.id)
  }

  const { error, count } = await query

  if (error) {
    console.error('Failed to delete record:', error)
    return fail(c, 500, 'DB_ERROR', 'Failed to delete record')
  }

  if (count === 0) {
    return fail(c, 403, 'FORBIDDEN', 'Record not deletable')
  }

  return ok(c, { deleted: true })
})

export default records
