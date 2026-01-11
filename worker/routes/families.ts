import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { ok, fail } from '../utils/http'
import { createUserClient, createServiceClient } from '../lib/supabase'

const createFamilySchema = z.object({
  name: z.string().trim().min(1).max(50)
})

const families = new Hono<AppEnv>()

families.get('/', async c => {
  const user = c.get('user')
  const accessToken = c.get('accessToken')
  if (!user || !accessToken) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const supabase = createUserClient(c.env, accessToken)

  const { data, error } = await supabase
    .from('family_members')
    .select('role, families(id, name)')
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to fetch families:', error)
    return fail(c, 500, 'DB_ERROR', 'Failed to fetch families')
  }

  const results = (data || []).map(row => ({
    id: (row.families as { id: string; name: string }).id,
    name: (row.families as { id: string; name: string }).name,
    role: row.role
  }))

  return ok(c, results)
})

families.post('/', async c => {
  const user = c.get('user')
  const accessToken = c.get('accessToken')
  if (!user || !accessToken) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

  const json = await c.req.json().catch(() => null)
  const parsed = createFamilySchema.safeParse(json)
  if (!parsed.success) return fail(c, 400, 'BAD_REQUEST', 'Invalid request body')

  const supabase = createUserClient(c.env, accessToken)
  const serviceClient = createServiceClient(c.env)

  // 使用 Service Client 检查用户创建的家庭数量（绕过 RLS）
  const { count, error: countError } = await serviceClient
    .from('families')
    .select('*', { count: 'exact', head: true })
    .eq('created_by_user_id', user.id)

  if (countError) {
    console.error('Failed to count families:', countError)
    return fail(c, 500, 'DB_ERROR', 'Failed to check family limit')
  }

  if ((count || 0) >= 3) {
    return fail(c, 403, 'FAMILY_LIMIT', 'Family creation limit reached')
  }

  // 创建家庭
  const { data: family, error: createError } = await supabase
    .from('families')
    .insert({ name: parsed.data.name, created_by_user_id: user.id })
    .select()
    .single()

  if (createError) {
    console.error('Failed to create family:', createError)
    return fail(c, 500, 'DB_ERROR', 'Failed to create family')
  }

  // 将创建者加入家庭
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    console.error('Failed to add member:', memberError)
    // 回滚：删除刚创建的家庭
    await supabase.from('families').delete().eq('id', family.id)
    return fail(c, 500, 'DB_ERROR', 'Failed to create family')
  }

  return ok(c, { id: family.id, name: family.name, createdAt: family.created_at }, 201)
})

export default families
