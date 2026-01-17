import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../types'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
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

/**
 * Turnstile 验证中间件
 * 验证请求中的 turnstileToken 字段
 */
export const verifyTurnstile: MiddlewareHandler<AppEnv> = async (c, next) => {
  // 本地开发环境跳过验证
  if (c.env.ENV === 'local') {
    await next()
    return
  }

  try {
    // 从请求体中获取 token
    const body = await c.req.json().catch(() => ({}))
    const token = body?.turnstileToken

    if (!token) {
      return jsonError(400, 'TURNSTILE_REQUIRED', 'Turnstile verification required')
    }

    // 特殊 token 用于测试
    if (token === 'dev' && c.env.ENV !== 'production') {
      await next()
      return
    }

    // 调用 Cloudflare Turnstile 验证 API
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: c.env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: c.req.header('CF-Connecting-IP') || '',
        }),
      }
    )

    const result = await verifyResponse.json() as TurnstileVerifyResponse

    if (!result.success) {
      console.error('Turnstile verification failed:', result['error-codes'])
      return jsonError(400, 'TURNSTILE_FAILED', 'Turnstile verification failed')
    }

    await next()
  } catch (error) {
    console.error('Turnstile middleware error:', error)
    return jsonError(500, 'INTERNAL_ERROR', 'Verification service error')
  }
}
