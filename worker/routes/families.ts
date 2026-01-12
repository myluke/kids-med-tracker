import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createServiceClient } from '../lib/supabase'
import { ServiceError } from '../errors/service-error'
import * as familiesService from '../services/families'
import type { ServiceContext } from '../services/types'

const families = new Hono<AppEnv>()

/**
 * 从 Hono Context 构建 ServiceContext
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
 * 统一错误处理
 */
function handleError(c: Parameters<typeof fail>[0], error: unknown) {
  if (error instanceof ServiceError) {
    return fail(c, error.statusCode, error.code, error.message)
  }
  console.error('Unexpected error:', error)
  return fail(c, 500, 'INTERNAL_ERROR', 'An unexpected error occurred')
}

families.get('/', async c => {
  try {
    const ctx = buildServiceContext(c)
    const data = await familiesService.listFamilies(ctx)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

families.post('/', async c => {
  try {
    const ctx = buildServiceContext(c)
    const json = await c.req.json().catch(() => ({}))
    const data = await familiesService.createFamily(ctx, json)
    return ok(c, data, 201)
  } catch (error) {
    return handleError(c, error)
  }
})

export default families
