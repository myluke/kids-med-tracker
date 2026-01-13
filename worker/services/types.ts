import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bindings, User } from '../types'

/**
 * 服务执行上下文
 * 包含服务方法所需的依赖
 */
export interface ServiceContext {
  /** Supabase 客户端（通常使用用户 JWT，受 RLS 约束；少数场景使用 service role） */
  db: SupabaseClient
  /** 当前用户（已认证的场景） */
  user: User
  /** 环境变量 */
  env: Bindings
}

/**
 * 可选用户的服务上下文（用于公开端点）
 */
export interface OptionalUserContext {
  db: SupabaseClient
  user?: User
  env: Bindings
}
