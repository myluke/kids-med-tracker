import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createServiceClient, checkFamilyMembership } from '../lib/supabase'

const createChildSchema = z.object({
  familyId: z.string().min(1),
  name: z.string().trim().min(1).max(50),
  emoji: z.string().trim().optional(),
  color: z.string().trim().optional(),
  gender: z.enum(['boy', 'girl']).optional(),
  age: z.string().trim().optional()
})

const updateChildSchema = z.object({
  familyId: z.string().min(1),
  name: z.string().trim().min(1).max(50).optional(),
  emoji: z.string().trim().optional(),
  color: z.string().trim().optional(),
  gender: z.enum(['boy', 'girl']).optional(),
  age: z.string().trim().optional()
})

const children = new Hono<AppEnv>()

children.get('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const familyId = c.req.query('familyId')
  if (!familyId) return fail(c, 400, 'BAD_REQUEST', 'Missing familyId')

  const serviceClient = createServiceClient(c.env)

  // 检查用户是否是家庭成员
  const role = await checkFamilyMembership(serviceClient, familyId, user.id)
  if (!role) {
    return fail(c, 403, 'FORBIDDEN', 'Not a family member')
  }

  const { data, error } = await serviceClient
    .from('children')
    .select('id, name, emoji, color, gender, age')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch children:', error)
    return fail(c, 500, 'DB_ERROR', 'Failed to fetch children')
  }

  return ok(c, data || [])
})

children.post('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = createChildSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const serviceClient = createServiceClient(c.env)

  // 检查用户是否是 owner
  const role = await checkFamilyMembership(serviceClient, parsed.data.familyId, user.id)
  if (role !== 'owner') {
    return fail(c, 403, 'FORBIDDEN', 'Only owner can manage children')
  }

  const { data: child, error } = await serviceClient
    .from('children')
    .insert({
      family_id: parsed.data.familyId,
      name: parsed.data.name,
      emoji: parsed.data.emoji || null,
      color: parsed.data.color || null,
      gender: parsed.data.gender || null,
      age: parsed.data.age || null
    })
    .select('id, name, emoji, color, gender, age')
    .single()

  if (error) {
    console.error('Failed to create child:', error)
    return fail(c, 500, 'DB_ERROR', 'Failed to create child')
  }

  return ok(c, child, 201)
})

children.patch('/:id', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const childId = c.req.param('id')
  const json = await c.req.json().catch(() => null)
  const parsed = updateChildSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const serviceClient = createServiceClient(c.env)

  // 检查用户是否是 owner
  const role = await checkFamilyMembership(serviceClient, parsed.data.familyId, user.id)
  if (role !== 'owner') {
    return fail(c, 403, 'FORBIDDEN', 'Only owner can manage children')
  }

  const updateData: Record<string, string | null> = {}
  if (typeof parsed.data.name === 'string') updateData.name = parsed.data.name
  if (typeof parsed.data.emoji === 'string') updateData.emoji = parsed.data.emoji
  if (typeof parsed.data.color === 'string') updateData.color = parsed.data.color
  if (typeof parsed.data.gender === 'string') updateData.gender = parsed.data.gender
  if (typeof parsed.data.age === 'string') updateData.age = parsed.data.age

  if (Object.keys(updateData).length === 0) {
    return fail(c, 400, 'BAD_REQUEST', 'No fields to update')
  }

  const { error, count } = await serviceClient
    .from('children')
    .update(updateData)
    .eq('id', childId)
    .eq('family_id', parsed.data.familyId)

  if (error) {
    console.error('Failed to update child:', error)
    return fail(c, 500, 'DB_ERROR', 'Failed to update child')
  }

  if (count === 0) {
    return fail(c, 404, 'NOT_FOUND', 'Child not found')
  }

  return ok(c, { updated: true })
})

children.delete('/:id', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const childId = c.req.param('id')
  const familyId = c.req.query('familyId')
  if (!familyId) return fail(c, 400, 'BAD_REQUEST', 'Missing familyId')

  const serviceClient = createServiceClient(c.env)

  // 检查用户是否是 owner
  const role = await checkFamilyMembership(serviceClient, familyId, user.id)
  if (role !== 'owner') {
    return fail(c, 403, 'FORBIDDEN', 'Only owner can manage children')
  }

  const { error, count } = await serviceClient
    .from('children')
    .delete()
    .eq('id', childId)
    .eq('family_id', familyId)

  if (error) {
    console.error('Failed to delete child:', error)
    return fail(c, 500, 'DB_ERROR', 'Failed to delete child')
  }

  if (count === 0) {
    return fail(c, 404, 'NOT_FOUND', 'Child not found')
  }

  return ok(c, { deleted: true })
})

export default children
