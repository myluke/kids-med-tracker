import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { consumeRateLimit } from '../services/rateLimit'
import { verifyTurnstile } from '../services/turnstile'
import { countFamiliesCreatedByUser, createFamily, listFamiliesForUser } from '../db/queries'

const createFamilySchema = z.object({
  name: z.string().trim().min(1).max(50),
  turnstileToken: z.string().min(1)
})

const families = new Hono<AppEnv>()

families.get('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const results = await listFamiliesForUser(c.env.DB, user.id)
  return ok(c, results)
})

families.post('/', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = createFamilySchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const skipTurnstile = c.env.ENV === 'local' && parsed.data.turnstileToken === 'dev'
  if (!skipTurnstile) {
    const remoteIp = c.req.header('cf-connecting-ip')
    const turnstile = await verifyTurnstile(c.env.TURNSTILE_SECRET_KEY, parsed.data.turnstileToken, remoteIp)
    if (!turnstile.ok) {
      return fail(c, 400, 'TURNSTILE_FAILED', 'Turnstile verification failed')
    }
  }

  const rate = await consumeRateLimit({
    db: c.env.DB,
    userId: user.id,
    action: 'family_create',
    windowMs: 10 * 60 * 1000,
    limit: 3
  })

  if (!rate.allowed) {
    c.header('Retry-After', String(rate.retryAfterSeconds ?? 60))
    return fail(c, 429, 'RATE_LIMITED', 'Too many requests')
  }

  const createdCount = await countFamiliesCreatedByUser(c.env.DB, user.id)
  if (createdCount >= 3) {
    return fail(c, 403, 'FAMILY_LIMIT', 'Family creation limit reached')
  }

  const family = await createFamily(c.env.DB, { name: parsed.data.name, createdByUserId: user.id })
  return ok(c, family, 201)
})

export default families
