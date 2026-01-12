import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createServiceClient } from '../lib/supabase'
import { ServiceError } from '../errors/service-error'
import * as invitesService from '../services/invites'
import type { ServiceContext, OptionalUserContext } from '../services/types'

const invites = new Hono<AppEnv>()

/**
 * 从 Hono Context 构建 ServiceContext（需要认证）
 */
function buildServiceContext(c: { get: (key: string) => unknown; env: AppEnv['Bindings'] }): ServiceContext {
  const user = c.get('user') as ServiceContext['user'] | undefined
  if (!user) throw ServiceError.unauthorized()

  return {
    db: createServiceClient(c.env),
    user,
    env: c.env,
  }
}

/**
 * 从 Hono Context 构建 OptionalUserContext（可选认证）
 */
function buildOptionalUserContext(c: { get: (key: string) => unknown; env: AppEnv['Bindings'] }): OptionalUserContext {
  const user = c.get('user') as ServiceContext['user'] | undefined

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

invites.post('/', async c => {
  try {
    const ctx = buildServiceContext(c)
    const json = await c.req.json().catch(() => ({}))
    const url = new URL(c.req.url)
    const data = await invitesService.createInvite(ctx, json, url.origin)
    return ok(c, data, 201)
  } catch (error) {
    return handleError(c, error)
  }
})

invites.post('/accept', async c => {
  try {
    const ctx = buildServiceContext(c)
    const json = await c.req.json().catch(() => ({}))
    const data = await invitesService.acceptInvite(ctx, json)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

// 验证邀请链接（不需要登录）
invites.get('/verify/:token', async c => {
  try {
    const ctx = buildOptionalUserContext(c)
    const input = {
      token: c.req.param('token') || '',
    }
    const data = await invitesService.verifyInvite(ctx, input)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

export default invites
