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
 * 创建带用户上下文的 Supabase 客户端（使用用户 JWT）
 * 此客户端受 RLS 约束，只能访问用户有权限的数据
 */
export function createUserClient(env: Bindings, accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
