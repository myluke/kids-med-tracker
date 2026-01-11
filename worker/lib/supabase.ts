import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Bindings } from '../types'

/**
 * 创建服务端 Supabase 客户端（使用 service role key）
 * 此客户端绕过 RLS，用于服务端特权操作
 */
export function createServiceClient(env: Bindings): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * 家庭成员角色类型
 */
export type FamilyRole = 'owner' | 'member'

/**
 * 检查用户是否是指定家庭的成员
 * @returns 成员角色或 null（如果不是成员）
 */
export async function checkFamilyMembership(
  client: SupabaseClient,
  familyId: string,
  userId: string
): Promise<FamilyRole | null> {
  const { data } = await client
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .single()

  return (data?.role as FamilyRole) || null
}

/**
 * 获取用户所属的所有家庭
 */
export async function getUserFamilies(
  client: SupabaseClient,
  userId: string
): Promise<Array<{ id: string; name: string; role: FamilyRole }>> {
  const { data, error } = await client
    .from('family_members')
    .select('role, families(id, name)')
    .eq('user_id', userId)

  if (error || !data) return []

  return data.map(row => ({
    id: (row.families as { id: string; name: string }).id,
    name: (row.families as { id: string; name: string }).name,
    role: row.role as FamilyRole
  }))
}

