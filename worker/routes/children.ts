import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createServiceClient, createUserClient } from '../lib/supabase'
import { ServiceError } from '../errors/service-error'
import * as childrenService from '../services/children'
import type { ServiceContext } from '../services/types'

const children = new Hono<AppEnv>()

/**
 * 从 Hono Context 构建 ServiceContext（用户态，受 RLS 约束）
 */
function buildUserServiceContext(c: { get: (key: string) => unknown; env: AppEnv['Bindings'] }): ServiceContext {
  const user = c.get('user') as ServiceContext['user'] | undefined
  const accessToken = c.get('accessToken') as string | undefined
  if (!user) throw ServiceError.unauthorized()
  if (!accessToken) throw ServiceError.unauthorized()

  return {
    db: createUserClient(c.env, accessToken),
    user,
    env: c.env,
  }
}

/**
 * 从 Hono Context 构建 ServiceContext（服务端特权，用于需要级联删除的操作）
 */
function buildAdminServiceContext(c: { get: (key: string) => unknown; env: AppEnv['Bindings'] }): ServiceContext {
  const user = c.get('user') as ServiceContext['user'] | undefined
  if (!user) throw ServiceError.unauthorized()

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

children.get('/', async c => {
  try {
    const ctx = buildUserServiceContext(c)
    const input = {
      familyId: c.req.query('familyId') || '',
    }

    const data = await childrenService.listChildren(ctx, input)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

children.post('/', async c => {
  try {
    const ctx = buildUserServiceContext(c)
    const json = await c.req.json().catch(() => ({}))
    const data = await childrenService.createChild(ctx, json)
    return ok(c, data, 201)
  } catch (error) {
    return handleError(c, error)
  }
})

children.patch('/:id', async c => {
  try {
    const ctx = buildUserServiceContext(c)
    const json = await c.req.json().catch(() => ({}))
    const input = {
      childId: c.req.param('id'),
      ...json,
    }
    const data = await childrenService.updateChild(ctx, input)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

children.delete('/:id', async c => {
  try {
    const ctx = buildAdminServiceContext(c)
    const input = {
      childId: c.req.param('id'),
      familyId: c.req.query('familyId') || '',
    }
    const data = await childrenService.deleteChild(ctx, input)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

export default children
