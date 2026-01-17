import { z } from 'zod'
import type { OptionalUserContext, ServiceContext } from './types'
import { ServiceError, ErrorCode } from '../errors/service-error'
import { getUserFamilies, type FamilyRole, createServiceClient } from '../lib/supabase'

// ============ Zod Schemas ============

export const sendMagicLinkInputSchema = z.object({
  email: z.string().email(),
})

export const checkPasswordInputSchema = z.object({
  email: z.string().email(),
})

export const signInPasswordInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const setPasswordInputSchema = z.object({
  password: z.string().min(6),
  verifyCode: z.string().length(6),
})

// ============ 类型定义 ============

export type SendMagicLinkInput = z.infer<typeof sendMagicLinkInputSchema>
export type CheckPasswordInput = z.infer<typeof checkPasswordInputSchema>
export type SignInPasswordInput = z.infer<typeof signInPasswordInputSchema>
export type SetPasswordInput = z.infer<typeof setPasswordInputSchema>

export interface MeResult {
  user: { id: string; email: string; hasPassword?: boolean } | null
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

    // 查询 user_profiles 获取 has_password
    const serviceClient = createServiceClient(ctx.env)
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('has_password')
      .eq('user_id', ctx.user.id)
      .single()

    return {
      user: {
        ...ctx.user,
        hasPassword: profile?.has_password ?? false
      },
      families
    }
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

/**
 * 检测邮箱是否设置了密码
 * @throws ServiceError 400 邮箱格式无效
 */
export async function checkPassword(
  ctx: OptionalUserContext,
  input: CheckPasswordInput
): Promise<{ hasPassword: boolean }> {
  const parsed = checkPasswordInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new ServiceError(400, ErrorCode.INVALID_EMAIL, 'Please provide a valid email address')
  }

  const serviceClient = createServiceClient(ctx.env)

  // 通过邮箱查找用户
  const { data: userData } = await serviceClient.auth.admin.listUsers()
  const user = userData?.users?.find(u => u.email === parsed.data.email)

  if (!user) {
    // 用户不存在，返回 hasPassword: false（新用户走 OTP 流程）
    return { hasPassword: false }
  }

  // 检查 user_profiles 表
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('has_password')
    .eq('user_id', user.id)
    .single()

  return { hasPassword: profile?.has_password ?? false }
}

/**
 * 密码登录
 * @throws ServiceError 400 邮箱或密码格式无效
 * @throws ServiceError 401 密码错误
 */
export async function signInWithPassword(
  ctx: OptionalUserContext,
  input: SignInPasswordInput
): Promise<{ session: { access_token: string; refresh_token: string } }> {
  const parsed = signInPasswordInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new ServiceError(400, ErrorCode.VALIDATION_ERROR, 'Invalid email or password format')
  }

  const { data, error } = await ctx.db.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.session) {
    throw ServiceError.invalidPassword('Invalid email or password')
  }

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  }
}

/**
 * 发送设置密码的验证码
 * 需要登录状态
 * @throws ServiceError 401 未登录
 * @throws ServiceError 500 发送失败
 */
export async function sendVerifyCode(
  ctx: ServiceContext
): Promise<{ sent: boolean }> {
  if (!ctx.user) {
    throw ServiceError.unauthorized()
  }

  // 发送 OTP 到用户邮箱（用于身份验证）
  const { error } = await ctx.db.auth.signInWithOtp({
    email: ctx.user.email,
  })

  if (error) {
    console.error('Send verify code error:', error)
    throw new ServiceError(500, ErrorCode.EMAIL_FAILED, 'Failed to send verification code')
  }

  return { sent: true }
}

/**
 * 设置密码
 * 需要登录状态 + 验证码确认
 * @throws ServiceError 401 未登录
 * @throws ServiceError 400 密码太短
 * @throws ServiceError 400 验证码无效
 */
export async function setPassword(
  ctx: ServiceContext,
  input: SetPasswordInput
): Promise<{ success: boolean }> {
  if (!ctx.user) {
    throw ServiceError.unauthorized()
  }

  const parsed = setPasswordInputSchema.safeParse(input)
  if (!parsed.success) {
    const errors = parsed.error.issues
    if (errors.some(e => e.path.includes('password'))) {
      throw ServiceError.passwordTooShort(6)
    }
    throw ServiceError.invalidVerifyCode()
  }

  // 验证 OTP
  const { error: verifyError } = await ctx.db.auth.verifyOtp({
    email: ctx.user.email,
    token: parsed.data.verifyCode,
    type: 'email',
  })

  if (verifyError) {
    console.error('Verify code error:', verifyError)
    throw ServiceError.invalidVerifyCode()
  }

  // 更新密码
  const { error: updateError } = await ctx.db.auth.updateUser({
    password: parsed.data.password,
  })

  if (updateError) {
    console.error('Update password error:', updateError)
    throw new ServiceError(500, ErrorCode.INTERNAL_ERROR, 'Failed to set password')
  }

  // 更新 user_profiles 表
  const serviceClient = createServiceClient(ctx.env)
  const { error: profileError } = await serviceClient
    .from('user_profiles')
    .upsert({
      user_id: ctx.user.id,
      has_password: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  if (profileError) {
    console.error('Update profile error:', profileError)
    // 密码已设置成功，profile 更新失败不影响登录
  }

  return { success: true }
}
