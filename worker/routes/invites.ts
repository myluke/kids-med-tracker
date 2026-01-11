import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { verifyTurnstile } from '../services/turnstile'
import { randomTokenBase64Url, sha256Hex } from '../utils/crypto'
import {
  createInvite,
  getFamilyRole,
  getInviteByTokenHash,
  markInviteUsed,
  upsertFamilyMember
} from '../db/queries'

const createInviteSchema = z.object({
  familyId: z.string().min(1)
})

const acceptInviteSchema = z.object({
  token: z.string().min(16),
  turnstileToken: z.string().min(1)
})

function addDaysIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

const invites = new Hono<AppEnv>()

invites.post('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = createInviteSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const role = await getFamilyRole(c.env.DB, { familyId: parsed.data.familyId, userId: user.id })
  if (role !== 'owner') return fail(c, 403, 'FORBIDDEN', 'Only owner can invite')

  const token = randomTokenBase64Url(32)
  const tokenHash = await sha256Hex(token + c.env.INVITE_TOKEN_PEPPER)
  const expiresAt = addDaysIso(7)

  await createInvite(c.env.DB, {
    familyId: parsed.data.familyId,
    createdByUserId: user.id,
    role: 'member',
    tokenHash,
    expiresAt
  })

  const url = new URL(c.req.url)
  const inviteUrl = `${url.origin}/invite/${token}`

  return ok(c, { inviteUrl, expiresAt }, 201)
})

invites.post('/accept', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = acceptInviteSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const skipTurnstile = c.env.ENV === 'local' && parsed.data.turnstileToken === 'dev'
  if (!skipTurnstile) {
    const remoteIp = c.req.header('cf-connecting-ip')
    const turnstile = await verifyTurnstile(c.env.TURNSTILE_SECRET_KEY, parsed.data.turnstileToken, remoteIp)
    if (!turnstile.ok) {
      return fail(c, 400, 'TURNSTILE_FAILED', 'Turnstile verification failed')
    }
  }

  const tokenHash = await sha256Hex(parsed.data.token + c.env.INVITE_TOKEN_PEPPER)
  const invite = await getInviteByTokenHash(c.env.DB, tokenHash)

  if (!invite) return fail(c, 404, 'NOT_FOUND', 'Invite not found')
  if (invite.usedAt) return fail(c, 410, 'GONE', 'Invite already used')
  if (new Date(invite.expiresAt).getTime() <= Date.now()) return fail(c, 410, 'GONE', 'Invite expired')

  await upsertFamilyMember(c.env.DB, {
    familyId: invite.familyId,
    userId: user.id,
    role: invite.role
  })

  await markInviteUsed(c.env.DB, { inviteId: invite.id, usedByUserId: user.id })

  return ok(c, { familyId: invite.familyId, role: invite.role })
})

export default invites
