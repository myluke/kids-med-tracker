import { apiFetch } from './api'
import { supabase } from '@/lib/supabase'

/**
 * 获取当前用户信息
 * @returns {Promise<{user: Object, families: Array}>}
 */
export async function getMe() {
  return apiFetch('/api/auth/me')
}

/**
 * 登出
 * 同时清除 Supabase session 和通知后端
 */
export async function logout() {
  // 先登出 Supabase
  await supabase.auth.signOut()

  // 通知后端
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // 忽略错误，本地状态已清除
  }
}
