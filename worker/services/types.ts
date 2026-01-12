import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bindings, User } from '../types'

/**
 * 服务执行上下文
 * 包含服务方法所需的依赖
 */
export interface ServiceContext {
  /** Supabase 服务客户端（绕过 RLS） */
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
