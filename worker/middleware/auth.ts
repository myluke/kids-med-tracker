import type { MiddlewareHandler } from 'hono'
import type { AppEnv, User } from '../types'
import { createServiceClient } from '../lib/supabase'

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
 * 从请求中提取 Supabase access token
 * 优先级：Authorization header > sb-access-token cookie
 */
function extractAccessToken(c: { req: { header: (name: string) => string | undefined } }): string | null {
  // 从 Authorization header 获取
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return null
}

/**
 * 认证中间件：验证 Supabase JWT 并获取用户信息
 * 验证成功后将用户信息和 access token 存入上下文
 */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const accessToken = extractAccessToken(c)

  if (!accessToken) {
    return jsonError(401, 'UNAUTHENTICATED', 'Not logged in')
  }

  try {
    const supabase = createServiceClient(c.env)

    // 使用 service client 验证 JWT
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      return jsonError(401, 'UNAUTHENTICATED', 'Invalid or expired session')
    }

    // 将用户信息和 access token 存入上下文
    c.set('user', {
      id: user.id,
      email: user.email || ''
    } as User)
    c.set('accessToken', accessToken)

    await next()
  } catch {
    return jsonError(401, 'UNAUTHENTICATED', 'Session validation failed')
  }
}

/**
 * 可选认证中间件：尝试读取用户，但不强制要求
 * 用于部分需要区分登录/未登录状态的路由
 */
export const optionalUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const accessToken = extractAccessToken(c)

  if (!accessToken) {
    await next()
    return
  }

  try {
    const supabase = createServiceClient(c.env)
    const { data: { user } } = await supabase.auth.getUser(accessToken)

    if (user) {
      c.set('user', {
        id: user.id,
        email: user.email || ''
      } as User)
      c.set('accessToken', accessToken)
    }
  } catch {
    // 忽略错误，继续处理请求
  }

  await next()
}
