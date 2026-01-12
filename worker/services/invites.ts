import { z } from 'zod'
import type { ServiceContext, OptionalUserContext } from './types'
import { ServiceError, ErrorCode } from '../errors/service-error'
import { checkFamilyMembership } from '../lib/supabase'
import { randomTokenBase64Url, sha256Hex } from '../utils/crypto'

// ============ Zod Schemas ============

export const createInviteInputSchema = z.object({
  familyId: z.string().min(1),
})

export const acceptInviteInputSchema = z.object({
  token: z.string().min(16),
})

export const verifyInviteInputSchema = z.object({
  token: z.string().min(16),
})

// ============ 类型定义 ============

export type CreateInviteInput = z.infer<typeof createInviteInputSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteInputSchema>
export type VerifyInviteInput = z.infer<typeof verifyInviteInputSchema>

export interface CreateInviteResult {
  inviteUrl: string
  expiresAt: string
}

export interface AcceptInviteResult {
  familyId: string
  role: string
}

export interface VerifyInviteResult {
  familyName: string
  role: string
  expiresAt: string
}

// ============ 辅助函数 ============

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// ============ 服务函数 ============

/**
 * 创建邀请
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 403 不是家庭 owner
 * @throws ServiceError 500 数据库错误
 */
export async function createInvite(
  ctx: ServiceContext,
  input: CreateInviteInput,
  baseUrl: string
): Promise<CreateInviteResult> {
  const parsed = createInviteInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }

  const role = await checkFamilyMembership(ctx.db, parsed.data.familyId, ctx.user.id)
  if (role !== 'owner') {
    throw ServiceError.notFamilyOwner()
  }

  const token = randomTokenBase64Url(32)
  const tokenHash = await sha256Hex(token + ctx.env.INVITE_TOKEN_PEPPER)
  const expiresAt = addDaysIso(7)

  const { error } = await ctx.db
    .from('invites')
    .insert({
      family_id: parsed.data.familyId,
      created_by_user_id: ctx.user.id,
      role: 'member',
      token_hash: tokenHash,
      expires_at: expiresAt,
    })

  if (error) {
    console.error('Failed to create invite:', error)
    throw ServiceError.dbError('Failed to create invite')
  }

  return {
    inviteUrl: `${baseUrl}/invite/${token}`,
    expiresAt,
  }
}

/**
 * 接受邀请
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 404 邀请不存在
 * @throws ServiceError 410 邀请已使用或已过期
 * @throws ServiceError 500 数据库错误
 */
export async function acceptInvite(
  ctx: ServiceContext,
  input: AcceptInviteInput
): Promise<AcceptInviteResult> {
  const parsed = acceptInviteInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }

  const tokenHash = await sha256Hex(parsed.data.token + ctx.env.INVITE_TOKEN_PEPPER)

  const { data: invite } = await ctx.db
    .from('invites')
    .select('id, family_id, role, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!invite) {
    throw ServiceError.notFound('Invite')
  }

  if (invite.used_at) {
    throw new ServiceError(410, ErrorCode.INVITE_USED, 'Invite already used')
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    throw new ServiceError(410, ErrorCode.INVITE_EXPIRED, 'Invite expired')
  }

  // 加入家庭
  const { error: memberError } = await ctx.db
    .from('family_members')
    .upsert({
      family_id: invite.family_id,
      user_id: ctx.user.id,
      role: invite.role,
    }, {
      onConflict: 'family_id,user_id',
    })

  if (memberError) {
    console.error('Failed to add member:', memberError)
    throw ServiceError.dbError('Failed to join family')
  }

  // 标记邀请已使用
  await ctx.db
    .from('invites')
    .update({
      used_at: new Date().toISOString(),
      used_by_user_id: ctx.user.id,
    })
    .eq('id', invite.id)

  return {
    familyId: invite.family_id,
    role: invite.role,
  }
}

/**
 * 验证邀请（公开端点，不需要登录）
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 404 邀请不存在
 * @throws ServiceError 410 邀请已使用或已过期
 */
export async function verifyInvite(
  ctx: OptionalUserContext,
  input: VerifyInviteInput
): Promise<VerifyInviteResult> {
  const parsed = verifyInviteInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }

  const tokenHash = await sha256Hex(parsed.data.token + ctx.env.INVITE_TOKEN_PEPPER)

  const { data: invite } = await ctx.db
    .from('invites')
    .select('id, family_id, role, expires_at, used_at, families(name)')
    .eq('token_hash', tokenHash)
    .single()

  if (!invite) {
    throw ServiceError.notFound('Invite')
  }

  if (invite.used_at) {
    throw new ServiceError(410, ErrorCode.INVITE_USED, 'Invite already used')
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    throw new ServiceError(410, ErrorCode.INVITE_EXPIRED, 'Invite expired')
  }

  return {
    familyName: (invite.families as { name: string }).name,
    role: invite.role,
    expiresAt: invite.expires_at,
  }
}
