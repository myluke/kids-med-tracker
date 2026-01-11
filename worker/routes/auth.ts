import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { listFamiliesForUser, upsertUser } from '../db/queries'

const auth = new Hono<AppEnv>()

auth.get('/me', async c => {
  const user = c.get('user')
  if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  await upsertUser(c.env.DB, { id: user.id, email: user.email })
  const families = await listFamiliesForUser(c.env.DB, user.id)

  return ok(c, { user, families })
})

export default auth
