import { z } from 'zod'
import type { OptionalUserContext } from './types'
import { ServiceError, ErrorCode } from '../errors/service-error'
import { getUserFamilies, type FamilyRole } from '../lib/supabase'

// ============ Zod Schemas ============

export const sendMagicLinkInputSchema = z.object({
  email: z.string().email(),
})

// ============ 类型定义 ============

export type SendMagicLinkInput = z.infer<typeof sendMagicLinkInputSchema>

export interface MeResult {
  user: { id: string; email: string } | null
  families: Array<{ id: string; name: string; role: FamilyRole }>
}

// ============ 服务函数 ============

/**
 * 发送 Magic Link
 * @throws ServiceError 400 邮箱格式无效
 * @throws ServiceError 500 发送邮件失败
 */
export async function sendMagicLink(
  ctx: OptionalUserContext,
  input: SendMagicLinkInput
): Promise<{ sent: boolean }> {
  const parsed = sendMagicLinkInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new ServiceError(400, ErrorCode.INVALID_EMAIL, 'Please provide a valid email address')
  }

  try {
    const { error } = await ctx.db.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${ctx.env.APP_URL}/auth/callback`,
      },
    })

    if (error) {
      console.error('Magic link error:', error)
      throw new ServiceError(500, ErrorCode.EMAIL_FAILED, 'Failed to send magic link')
    }

    return { sent: true }
  } catch (err) {
    if (err instanceof ServiceError) throw err
    console.error('Failed to send magic link:', err)
    throw new ServiceError(500, ErrorCode.EMAIL_FAILED, 'Failed to send magic link')
  }
}

/**
 * 获取当前用户信息
 */
export async function getMe(ctx: OptionalUserContext): Promise<MeResult> {
  if (!ctx.user) {
    return { user: null, families: [] }
  }

  try {
    const families = await getUserFamilies(ctx.db, ctx.user.id)
    return { user: ctx.user, families }
  } catch (err) {
    console.error('Failed to get user:', err)
    return { user: null, families: [] }
  }
}

/**
 * 登出（服务端无需特殊处理）
 */
export function logout(): { loggedOut: boolean } {
  return { loggedOut: true }
}
