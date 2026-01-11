import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { randomTokenBase64Url, sha256Hex } from '../utils/crypto'
import { createUserClient, createServiceClient } from '../lib/supabase'

const createInviteSchema = z.object({
  familyId: z.string().min(1)
})

const acceptInviteSchema = z.object({
  token: z.string().min(16)
})

function addDaysIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

const invites = new Hono<AppEnv>()

invites.post('/', async c => {
  const user = c.get('user')
  const accessToken = c.get('accessToken')
  if (!user || !accessToken) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = createInviteSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const supabase = createUserClient(c.env, accessToken)

  // 检查用户是否是 owner（RLS 策略会阻止非 owner 创建邀请，但我们提前检查以返回友好错误）
  const { data: membership } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', parsed.data.familyId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return fail(c, 403, 'FORBIDDEN', 'Only owner can invite')
  }

  const token = randomTokenBase64Url(32)
  const tokenHash = await sha256Hex(token + c.env.INVITE_TOKEN_PEPPER)
  const expiresAt = addDaysIso(7)

  const { error } = await supabase
    .from('invites')
    .insert({
      family_id: parsed.data.familyId,
      created_by_user_id: user.id,
      role: 'member',
      token_hash: tokenHash,
      expires_at: expiresAt
    })

  if (error) {
    console.error('Failed to create invite:', error)
    return fail(c, 500, 'DB_ERROR', 'Failed to create invite')
  }

  const url = new URL(c.req.url)
  const inviteUrl = `${url.origin}/invite/${token}`

  return ok(c, { inviteUrl, expiresAt }, 201)
})

invites.post('/accept', async c => {
  const user = c.get('user')
  const accessToken = c.get('accessToken')
  if (!user || !accessToken) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = acceptInviteSchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const tokenHash = await sha256Hex(parsed.data.token + c.env.INVITE_TOKEN_PEPPER)

  // 使用 service client 查询邀请（因为 RLS 可能限制用户查看未接受的邀请）
  const serviceClient = createServiceClient(c.env)
  const { data: invite } = await serviceClient
    .from('invites')
    .select('id, family_id, role, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!invite) return fail(c, 404, 'NOT_FOUND', 'Invite not found')
  if (invite.used_at) return fail(c, 410, 'GONE', 'Invite already used')
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return fail(c, 410, 'GONE', 'Invite expired')
  }

  // 使用 Service Client 将用户加入家庭（绕过 RLS，因为新用户还不是任何家庭的成员）
  const { error: memberError } = await serviceClient
    .from('family_members')
    .upsert({
      family_id: invite.family_id,
      user_id: user.id,
      role: invite.role
    }, {
      onConflict: 'family_id,user_id'
    })

  if (memberError) {
    console.error('Failed to add member:', memberError)
    return fail(c, 500, 'DB_ERROR', 'Failed to join family')
  }

  // 标记邀请已使用（使用 service client 以绕过 RLS）
  await serviceClient
    .from('invites')
    .update({
      used_at: new Date().toISOString(),
      used_by_user_id: user.id
    })
    .eq('id', invite.id)

  return ok(c, { familyId: invite.family_id, role: invite.role })
})

// 验证邀请链接（不需要登录）
invites.get('/verify/:token', async c => {
  const token = c.req.param('token')
  if (!token || token.length < 16) {
    return fail(c, 400, 'BAD_REQUEST', 'Invalid token')
  }

  const tokenHash = await sha256Hex(token + c.env.INVITE_TOKEN_PEPPER)
  const serviceClient = createServiceClient(c.env)

  const { data: invite } = await serviceClient
    .from('invites')
    .select('id, family_id, role, expires_at, used_at, families(name)')
    .eq('token_hash', tokenHash)
    .single()

  if (!invite) return fail(c, 404, 'NOT_FOUND', 'Invite not found')
  if (invite.used_at) return fail(c, 410, 'GONE', 'Invite already used')
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return fail(c, 410, 'GONE', 'Invite expired')
  }

  return ok(c, {
    familyName: (invite.families as { name: string }).name,
    role: invite.role,
    expiresAt: invite.expires_at
  })
})

export default invites
