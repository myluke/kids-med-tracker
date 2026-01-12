import { z } from 'zod'
import type { ServiceContext } from './types'
import { ServiceError, ErrorCode } from '../errors/service-error'
import { getUserFamilies, type FamilyRole } from '../lib/supabase'

// ============ Zod Schemas ============

export const createFamilyInputSchema = z.object({
  name: z.string().trim().min(1).max(50),
})

// ============ 类型定义 ============

export type CreateFamilyInput = z.infer<typeof createFamilyInputSchema>

export interface FamilyDto {
  id: string
  name: string
  role: FamilyRole
}

export interface CreateFamilyResult {
  id: string
  name: string
  createdAt: string
}

// ============ 常量 ============

const MAX_FAMILIES_PER_USER = 3

// ============ 服务函数 ============

/**
 * 获取用户所属的家庭列表
 */
export async function listFamilies(ctx: ServiceContext): Promise<FamilyDto[]> {
  return getUserFamilies(ctx.db, ctx.user.id)
}

/**
 * 创建家庭
 * @throws ServiceError 400 输入验证失败
 * @throws ServiceError 403 超过家庭创建限制
 * @throws ServiceError 500 数据库错误
 */
export async function createFamily(
  ctx: ServiceContext,
  input: CreateFamilyInput
): Promise<CreateFamilyResult> {
  const parsed = createFamilyInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }

  // 检查家庭数量限制
  const { count, error: countError } = await ctx.db
    .from('families')
    .select('*', { count: 'exact', head: true })
    .eq('created_by_user_id', ctx.user.id)

  if (countError) {
    console.error('Failed to count families:', countError)
    throw ServiceError.dbError('Failed to check family limit')
  }

  if ((count || 0) >= MAX_FAMILIES_PER_USER) {
    throw new ServiceError(403, ErrorCode.FAMILY_LIMIT, 'Family creation limit reached')
  }

  // 创建家庭
  const { data: family, error: createError } = await ctx.db
    .from('families')
    .insert({ name: parsed.data.name, created_by_user_id: ctx.user.id })
    .select()
    .single()

  if (createError) {
    console.error('Failed to create family:', createError)
    throw ServiceError.dbError('Failed to create family')
  }

  // 将创建者加入家庭
  const { error: memberError } = await ctx.db
    .from('family_members')
    .insert({ family_id: family.id, user_id: ctx.user.id, role: 'owner' })

  if (memberError) {
    console.error('Failed to add member:', memberError)
    // 回滚
    await ctx.db.from('families').delete().eq('id', family.id)
    throw ServiceError.dbError('Failed to create family')
  }

  return {
    id: family.id,
    name: family.name,
    createdAt: family.created_at,
  }
}
