import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createUserClient } from '../lib/supabase'
import { ServiceError } from '../errors/service-error'
import * as episodesService from '../services/episodes'
import type { ServiceContext } from '../services/types'

const episodes = new Hono<AppEnv>()

/**
 * Build ServiceContext from Hono Context
 */
function buildServiceContext(c: { get: (key: string) => unknown; env: AppEnv['Bindings'] }): ServiceContext {
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
 * Unified error handling
 */
function handleError(c: Parameters<typeof fail>[0], error: unknown) {
  if (error instanceof ServiceError) {
    return fail(c, error.statusCode, error.code, error.message)
  }
  console.error('Unexpected error:', error)
  return fail(c, 500, 'INTERNAL_ERROR', 'An unexpected error occurred')
}

/**
 * GET /api/episodes
 * List episodes for a child
 */
episodes.get('/', async c => {
  try {
    const ctx = buildServiceContext(c)
    const limitRaw = c.req.query('limit')
    const input = {
      familyId: c.req.query('familyId') || '',
      childId: c.req.query('childId') || '',
      status: (c.req.query('status') as 'active' | 'recovered' | 'all') || 'all',
      limit: Math.min(50, Math.max(1, Number(limitRaw ?? 20) || 20)),
    }

    const data = await episodesService.listEpisodes(ctx, input)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * GET /api/episodes/active
 * Get active episode for a child
 */
episodes.get('/active', async c => {
  try {
    const ctx = buildServiceContext(c)
    const input = {
      familyId: c.req.query('familyId') || '',
      childId: c.req.query('childId') || '',
    }

    const data = await episodesService.getOrCreateActiveEpisode(ctx, input)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * POST /api/episodes/:id/end
 * Mark episode as recovered
 */
episodes.post('/:id/end', async c => {
  try {
    const ctx = buildServiceContext(c)
    const json = await c.req.json().catch(() => ({}))
    const input = {
      episodeId: c.req.param('id'),
      familyId: json.familyId || '',
    }

    const data = await episodesService.endEpisode(ctx, input)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * GET /api/episodes/:id/stats
 * Get episode statistics
 */
episodes.get('/:id/stats', async c => {
  try {
    const ctx = buildServiceContext(c)
    const input = {
      episodeId: c.req.param('id'),
      familyId: c.req.query('familyId') || '',
    }

    const data = await episodesService.getEpisodeStats(ctx, input)
    return ok(c, data)
  } catch (error) {
    return handleError(c, error)
  }
})

export default episodes
