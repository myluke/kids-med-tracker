import type { MiddlewareHandler } from 'hono'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { AppEnv, User } from '../types'
import { sha256Hex } from '../utils/crypto'

const jwksByOrigin = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getJwks(origin: string) {
  const existing = jwksByOrigin.get(origin)
  if (existing) return existing

  const url = new URL('/cdn-cgi/access/certs', origin)
  const jwks = createRemoteJWKSet(url)
  jwksByOrigin.set(origin, jwks)
  return jwks
}

function jsonError(status: number, code: string, message: string) {
  return new Response(
    JSON.stringify({ ok: false, error: { code, message } }),
    {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    }
  )
}

async function devUserFromHeader(email: string): Promise<User> {
  const normalized = email.trim().toLowerCase()
  const id = `dev-${await sha256Hex(normalized)}`
  return { id, email: normalized }
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.env.ENV === 'local') {
    const devEmail = c.req.header('x-dev-user')
    if (devEmail) {
      c.set('user', await devUserFromHeader(devEmail))
      await next()
      return
    }
  }

  const token = c.req.header('cf-access-jwt-assertion')
  if (!token) {
    return jsonError(401, 'UNAUTHENTICATED', 'Missing Access JWT')
  }

  try {
    const url = new URL(c.req.url)
    const jwks = getJwks(url.origin)

    const { payload } = await jwtVerify(token, jwks, {
      audience: c.env.ACCESS_AUD,
      issuer: c.env.ACCESS_ISS
    })

    const sub = payload.sub
    const email = payload.email

    if (typeof sub !== 'string' || typeof email !== 'string') {
      return jsonError(401, 'UNAUTHENTICATED', 'Invalid Access JWT claims')
    }

    c.set('user', { id: sub, email })
    await next()
  } catch {
    return jsonError(401, 'UNAUTHENTICATED', 'Invalid Access JWT')
  }
}
