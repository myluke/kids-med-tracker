import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createServiceClient, getUserFamilies } from '../lib/supabase'
import { optionalUser } from '../middleware/auth'

const auth = new Hono<AppEnv>()

// /me 和 /logout 需要可选认证
auth.use('/me', optionalUser)
auth.use('/logout', optionalUser)

/**
 * 验证邮箱格式
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * POST /api/auth/send-magic-link
 * 发送 Magic Link 到邮箱
 * 注意：前端也可以直接调用 Supabase SDK 发送，此端点作为备选
 */
auth.post('/send-magic-link', async c => {
  const body = await c.req.json<{ email?: string }>()
  const { email } = body

  if (!email || !isValidEmail(email)) {
    return fail(c, 400, 'INVALID_EMAIL', 'Please provide a valid email address')
  }

  try {
    const serviceClient = createServiceClient(c.env)

    const { error } = await serviceClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${c.env.APP_URL}/auth/callback`
      }
    })

    if (error) {
      console.error('Magic link error:', error)
      return fail(c, 500, 'EMAIL_FAILED', 'Failed to send magic link')
    }

    return ok(c, { sent: true })
  } catch (err) {
    console.error('Failed to send magic link:', err)
    return fail(c, 500, 'EMAIL_FAILED', 'Failed to send magic link')
  }
})

/**
 * POST /api/auth/logout
 * 登出
 */
auth.post('/logout', async c => {
  // 服务端不需要做特殊处理，客户端会清除本地 session
  return ok(c, { loggedOut: true })
})

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
auth.get('/me', async c => {
  const user = c.get('user')

  if (!user) {
    return ok(c, { user: null, families: [] })
  }

  try {
    const serviceClient = createServiceClient(c.env)

    // 使用 upsert：不存在则创建用户，存在则更新登录时间
    await serviceClient
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: user.email,
        last_login_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    // 获取用户家庭列表
    const families = await getUserFamilies(serviceClient, user.id)

    return ok(c, { user, families })
  } catch (err) {
    console.error('Failed to get user:', err)
    return ok(c, { user: null, families: [] })
  }
})

export default auth
