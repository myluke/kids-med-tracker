import type { Context } from 'hono'
import type { AppEnv } from '../types'

export function ok<T>(c: Context<AppEnv>, data: T, status = 200) {
  c.header('Cache-Control', 'no-store')
  return c.json({ ok: true, data }, status)
}

export function fail(c: Context<AppEnv>, status: number, code: string, message: string) {
  c.header('Cache-Control', 'no-store')
  return c.json({ ok: false, error: { code, message } }, status)
}
