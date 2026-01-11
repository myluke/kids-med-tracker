import { Hono } from 'hono'
import api from './routes/api'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.route('/api', api)

app.all('*', async c => {
  const request = c.req.raw
  const url = new URL(request.url)

  if (url.pathname.startsWith('/api/')) {
    return new Response('Not Found', { status: 404 })
  }

  const assetResponse = await c.env.ASSETS.fetch(request)
  if (assetResponse.status !== 404) {
    return assetResponse
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const indexRequest = new Request(new URL('/index.html', url.origin), request)
  return c.env.ASSETS.fetch(indexRequest)
})

export default app
