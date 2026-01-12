import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createServiceClient } from '../lib/supabase'
import { ServiceError } from '../errors/service-error'
import { optionalUser } from '../middleware/auth'
import * as authService from '../services/auth'
import type { OptionalUserContext } from '../services/types'

const auth = new Hono<AppEnv>()

// /me 和 /logout 需要可选认证
auth.use('/me', optionalUser)
auth.use('/logout', optionalUser)

/**
 * 从 Hono Context 构建 OptionalUserContext
 */
function buildOptionalUserContext(c: { get: (key: string) => unknown; env: AppEnv['Bindings'] }): OptionalUserContext {
  const user = c.get('user') as OptionalUserContext['user']

  return {
    db: createServiceClient(c.env),
    user,
    env: c.env,
  }
}

/**
 * 统一错误处理
 */
function handleError(c: Parameters<typeof fail>[0], error: unknown) {
  if (error instanceof ServiceError) {
    return fail(c, error.statusCode, error.code, error.message)
  }
  console.error('Unexpected error:', error)
  return fail(c, 500, 'INTERNAL_ERROR', 'An unexpected error occurred')
}

/**
 * POST /api/auth/send-magic-link
 * 发送 Magic Link 到邮箱
 */
auth.post('/send-magic-link', async c => {
  try {
    const ctx = buildOptionalUserContext(c)
    const json = await c.req.json<{ email?: string }>().catch(() => ({}))
    const data = await authService.sendMagicLink(ctx, { email: json.email || '' })
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * POST /api/auth/logout
 * 登出
 */
auth.post('/logout', async c => {
  const data = authService.logout()
  return ok(c, data)
})

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
auth.get('/me', async c => {
  try {
    const ctx = buildOptionalUserContext(c)
    const data = await authService.getMe(ctx)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

export default auth
