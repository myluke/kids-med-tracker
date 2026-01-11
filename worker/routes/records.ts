import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createRecord, deleteRecord, getFamilyRole, listRecords, updateRecord } from '../db/queries'

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

  const role = await getFamilyRole(c.env.DB, { familyId, userId: user.id })
  if (!role) return fail(c, 403, 'FORBIDDEN', 'Not a family member')

  const childId = c.req.query('childId') ?? undefined
  const since = c.req.query('since') ?? undefined
  const limitRaw = c.req.query('limit')

  const limit = Math.min(500, Math.max(1, Number(limitRaw ?? 200) || 200))

  const results = await listRecords(c.env.DB, { familyId, childId, since, limit })
  return ok(c, results)
})

records.post('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = createRecordSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const role = await getFamilyRole(c.env.DB, { familyId: parsed.data.familyId, userId: user.id })
  if (!role) return fail(c, 403, 'FORBIDDEN', 'Not a family member')

  const payloadJson = JSON.stringify(parsed.data.payload ?? null)
  const record = await createRecord(c.env.DB, {
    familyId: parsed.data.familyId,
    childId: parsed.data.childId,
    type: parsed.data.type,
    time: parsed.data.time,
    payloadJson,
    createdByUserId: user.id
  })

  return ok(c, record, 201)
})

records.patch('/:id', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const recordId = c.req.param('id')
  const json = await c.req.json().catch(() => null)
  const parsed = updateRecordSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const role = await getFamilyRole(c.env.DB, { familyId: parsed.data.familyId, userId: user.id })
  if (!role) return fail(c, 403, 'FORBIDDEN', 'Not a family member')

  const payloadJson = JSON.stringify(parsed.data.payload ?? null)
  const res = await updateRecord(c.env.DB, {
    familyId: parsed.data.familyId,
    recordId,
    payloadJson,
    userId: user.id,
    canEditAny: role === 'owner'
  })

  if (!res.updated) return fail(c, 403, 'FORBIDDEN', 'Record not editable')
  return ok(c, { updated: true })
})

records.delete('/:id', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const recordId = c.req.param('id')
  const familyId = c.req.query('familyId')
  if (!familyId) return fail(c, 400, 'BAD_REQUEST', 'Missing familyId')

  const role = await getFamilyRole(c.env.DB, { familyId, userId: user.id })
  if (!role) return fail(c, 403, 'FORBIDDEN', 'Not a family member')

  const res = await deleteRecord(c.env.DB, {
    familyId,
    recordId,
    userId: user.id,
    canDeleteAny: role === 'owner'
  })

  if (!res.deleted) return fail(c, 403, 'FORBIDDEN', 'Record not deletable')
  return ok(c, { deleted: true })
})

export default records
