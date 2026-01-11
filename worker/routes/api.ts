import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { requireUser } from '../middleware/auth'
import auth from './auth'
import families from './families'
import invites from './invites'
import children from './children'
import records from './records'
import { ok, fail } from '../utils/http'
import { sha256Hex } from '../utils/crypto'
import { createServiceClient } from '../lib/supabase'

const api = new Hono<AppEnv>()

// 禁用缓存
api.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  await next()
})

// 健康检查（无需认证）
api.get('/health', c => {
  return c.json({ ok: true })
})

// 认证路由（中间件在 auth.ts 内部处理）
api.route('/auth', auth)

// 邀请验证路由（无需认证）
api.get('/invites/verify/:token', async c => {
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

// 以下路由需要认证
api.use('/families/*', requireUser)
api.use('/invites/*', requireUser)
api.use('/children/*', requireUser)
api.use('/records/*', requireUser)

api.route('/families', families)
api.route('/invites', invites)
api.route('/children', children)
api.route('/records', records)

export default api
