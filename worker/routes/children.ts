import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createChild, deleteChild, getFamilyRole, listChildren, updateChild } from '../db/queries'

const createChildSchema = z.object({
  familyId: z.string().min(1),
  name: z.string().trim().min(1).max(50),
  emoji: z.string().trim().optional(),
  color: z.string().trim().optional()
})

const updateChildSchema = z.object({
  familyId: z.string().min(1),
  name: z.string().trim().min(1).max(50).optional(),
  emoji: z.string().trim().optional(),
  color: z.string().trim().optional()
})

const children = new Hono<AppEnv>()

children.get('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const familyId = c.req.query('familyId')
  if (!familyId) return fail(c, 400, 'BAD_REQUEST', 'Missing familyId')

  const role = await getFamilyRole(c.env.DB, { familyId, userId: user.id })
  if (!role) return fail(c, 403, 'FORBIDDEN', 'Not a family member')

  const results = await listChildren(c.env.DB, familyId)
  return ok(c, results)
})

children.post('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = createChildSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const role = await getFamilyRole(c.env.DB, { familyId: parsed.data.familyId, userId: user.id })
  if (role !== 'owner') return fail(c, 403, 'FORBIDDEN', 'Only owner can manage children')

  const child = await createChild(c.env.DB, parsed.data)
  return ok(c, child, 201)
})

children.patch('/:id', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const childId = c.req.param('id')
  const json = await c.req.json().catch(() => null)
  const parsed = updateChildSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const role = await getFamilyRole(c.env.DB, { familyId: parsed.data.familyId, userId: user.id })
  if (role !== 'owner') return fail(c, 403, 'FORBIDDEN', 'Only owner can manage children')

  const res = await updateChild(c.env.DB, {
    familyId: parsed.data.familyId,
    childId,
    name: parsed.data.name,
    emoji: parsed.data.emoji,
    color: parsed.data.color
  })

  if (!res.updated) return fail(c, 404, 'NOT_FOUND', 'Child not found')
  return ok(c, { updated: true })
})

children.delete('/:id', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const childId = c.req.param('id')
  const familyId = c.req.query('familyId')
  if (!familyId) return fail(c, 400, 'BAD_REQUEST', 'Missing familyId')

  const role = await getFamilyRole(c.env.DB, { familyId, userId: user.id })
  if (role !== 'owner') return fail(c, 403, 'FORBIDDEN', 'Only owner can manage children')

  const res = await deleteChild(c.env.DB, { familyId, childId })
  if (!res.deleted) return fail(c, 404, 'NOT_FOUND', 'Child not found')

  return ok(c, { deleted: true })
})

export default children
