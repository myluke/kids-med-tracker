import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { requireUser } from '../middleware/auth'
import auth from './auth'
import families from './families'
import invites from './invites'
import children from './children'
import records from './records'

const api = new Hono<AppEnv>()

api.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  await next()
})

api.get('/health', c => {
  return c.json({ ok: true })
})

api.use('*', requireUser)

api.route('/auth', auth)
api.route('/families', families)
api.route('/invites', invites)
api.route('/children', children)
api.route('/records', records)

export default api
