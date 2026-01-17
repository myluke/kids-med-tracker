import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createAnonClient, createUserClient } from '../lib/supabase'
import { ServiceError } from '../errors/service-error'
import { optionalUser, requireUser } from '../middleware/auth'
import { verifyTurnstile } from '../middleware/turnstile'
import * as authService from '../services/auth'
import type { OptionalUserContext, ServiceContext } from '../services/types'

const auth = new Hono<AppEnv>()

// /me 和 /logout 需要可选认证
auth.use('/me', optionalUser)
auth.use('/logout', optionalUser)

// 需要认证的密码设置端点
auth.use('/send-verify-code', requireUser)
auth.use('/set-password', requireUser)

/**
 * 从 Hono Context 构建 OptionalUserContext
 */
function buildOptionalUserContext(c: { get: (key: string) => unknown; env: AppEnv['Bindings'] }): OptionalUserContext {
  const user = c.get('user') as OptionalUserContext['user']
  const accessToken = c.get('accessToken') as string | undefined

  return {
    db: accessToken ? createUserClient(c.env, accessToken) : createAnonClient(c.env),
    user,
    env: c.env,
  }
}

/**
 * 从 Hono Context 构建 ServiceContext（需要已认证）
 */
function buildServiceContext(c: { get: (key: string) => unknown; env: AppEnv['Bindings'] }): ServiceContext {
  const user = c.get('user') as ServiceContext['user']
  const accessToken = c.get('accessToken') as string

  return {
    db: createUserClient(c.env, accessToken),
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

/**
 * POST /api/auth/check-password
 * 检测邮箱是否设置了密码
 * 需要 Turnstile 验证
 */
auth.post('/check-password', verifyTurnstile, async c => {
  try {
    const ctx = buildOptionalUserContext(c)
    const json = await c.req.json<{ email?: string }>().catch(() => ({}))
    const data = await authService.checkPassword(ctx, { email: json.email || '' })
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * POST /api/auth/sign-in-password
 * 密码登录
 * 需要 Turnstile 验证
 */
auth.post('/sign-in-password', verifyTurnstile, async c => {
  try {
    const ctx = buildOptionalUserContext(c)
    const json = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}))
    const data = await authService.signInWithPassword(ctx, {
      email: json.email || '',
      password: json.password || '',
    })
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * POST /api/auth/send-verify-code
 * 发送设置密码的验证码
 * 需要登录状态
 */
auth.post('/send-verify-code', async c => {
  try {
    const ctx = buildServiceContext(c)
    const data = await authService.sendVerifyCode(ctx)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * POST /api/auth/set-password
 * 设置密码
 * 需要登录状态 + 验证码
 */
auth.post('/set-password', async c => {
  try {
    const ctx = buildServiceContext(c)
    const json = await c.req.json<{ password?: string; verifyCode?: string }>().catch(() => ({}))
    const data = await authService.setPassword(ctx, {
      password: json.password || '',
      verifyCode: json.verifyCode || '',
    })
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

export default auth
