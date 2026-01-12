import { supabase } from '@/lib/supabase'

/**
 * 通用 API 请求函数
 * 自动处理认证 token 和响应解析
 */
export async function apiFetch(path, { method = 'GET', json, query, headers } = {}) {
  const url = new URL(path, window.location.origin)
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      url.searchParams.set(k, String(v))
    })
  }

  // 从 Supabase 获取 access token
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  const requestHeaders = {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(headers || {})
  }

  const res = await fetch(url.toString(), {
    method,
    headers: requestHeaders,
    body: json ? JSON.stringify(json) : undefined
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    if (isJson && data && data.error) {
      const message = data.error.message || data.error.code || 'Request failed'
      throw new Error(message)
    }
    throw new Error(typeof data === 'string' ? data : 'Request failed')
  }

  if (isJson && data && data.ok === false) {
    throw new Error(data.error?.message || 'Request failed')
  }

  return isJson && data && data.ok === true ? data.data : data
}

/**
 * 安全解析 JSON
 */
export function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
