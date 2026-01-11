export type RateLimitDecision = {
  allowed: boolean
  retryAfterSeconds?: number
}

export async function consumeRateLimit(params: {
  db: D1Database
  userId: string
  action: string
  windowMs: number
  limit: number
}): Promise<RateLimitDecision> {
  const now = Date.now()
  const windowStartMs = Math.floor(now / params.windowMs) * params.windowMs
  const windowStart = new Date(windowStartMs).toISOString()
  const key = `${params.userId}:${params.action}:${windowStart}`

  const row = await params.db
    .prepare('SELECT count FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ count: number }>()

  const updatedAt = new Date().toISOString()

  if (row && row.count >= params.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowStartMs + params.windowMs - now) / 1000))
    return { allowed: false, retryAfterSeconds }
  }

  if (!row) {
    await params.db
      .prepare(
        'INSERT INTO rate_limits (key, user_id, action, window_start, count, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(key, params.userId, params.action, windowStart, 1, updatedAt)
      .run()
    return { allowed: true }
  }

  await params.db
    .prepare('UPDATE rate_limits SET count = count + 1, updated_at = ? WHERE key = ?')
    .bind(updatedAt, key)
    .run()

  return { allowed: true }
}
