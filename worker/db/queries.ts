export type FamilyRole = 'owner' | 'member'

export function nowIso() {
  return new Date().toISOString()
}

export async function upsertUser(db: D1Database, params: { id: string; email: string }) {
  const now = nowIso()
  await db
    .prepare(
      'INSERT INTO users (id, email, created_at, last_login_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, last_login_at = excluded.last_login_at'
    )
    .bind(params.id, params.email, now, now)
    .run()
}

export async function listFamiliesForUser(db: D1Database, userId: string) {
  const { results } = await db
    .prepare(
      'SELECT f.id as id, f.name as name, fm.role as role FROM family_members fm JOIN families f ON f.id = fm.family_id WHERE fm.user_id = ? ORDER BY f.created_at DESC'
    )
    .bind(userId)
    .all<{ id: string; name: string; role: FamilyRole }>()

  return results
}

export async function getFamilyRole(db: D1Database, params: { familyId: string; userId: string }) {
  const row = await db
    .prepare('SELECT role FROM family_members WHERE family_id = ? AND user_id = ?')
    .bind(params.familyId, params.userId)
    .first<{ role: FamilyRole }>()

  return row?.role ?? null
}

export async function countFamiliesCreatedByUser(db: D1Database, userId: string) {
  const row = await db
    .prepare('SELECT COUNT(*) as cnt FROM families WHERE created_by_user_id = ?')
    .bind(userId)
    .first<{ cnt: number }>()

  return row?.cnt ?? 0
}

export async function createFamily(db: D1Database, params: { name: string; createdByUserId: string }) {
  const id = crypto.randomUUID()
  const createdAt = nowIso()

  await db
    .prepare('INSERT INTO families (id, name, created_by_user_id, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, params.name, params.createdByUserId, createdAt)
    .run()

  await db
    .prepare('INSERT INTO family_members (family_id, user_id, role, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, params.createdByUserId, 'owner', createdAt)
    .run()

  return { id, name: params.name, createdAt }
}

export async function createInvite(db: D1Database, params: {
  familyId: string
  createdByUserId: string
  role: FamilyRole
  tokenHash: string
  expiresAt: string
}) {
  const id = crypto.randomUUID()
  const createdAt = nowIso()

  await db
    .prepare(
      'INSERT INTO invites (id, family_id, created_by_user_id, role, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, params.familyId, params.createdByUserId, params.role, params.tokenHash, params.expiresAt, createdAt)
    .run()

  return { id, expiresAt: params.expiresAt }
}

export async function getInviteByTokenHash(db: D1Database, tokenHash: string) {
  return db
    .prepare(
      'SELECT id, family_id as familyId, role, expires_at as expiresAt, used_at as usedAt FROM invites WHERE token_hash = ?'
    )
    .bind(tokenHash)
    .first<{ id: string; familyId: string; role: FamilyRole; expiresAt: string; usedAt: string | null }>()
}

export async function markInviteUsed(db: D1Database, params: { inviteId: string; usedByUserId: string }) {
  const usedAt = nowIso()
  await db
    .prepare('UPDATE invites SET used_at = ?, used_by_user_id = ? WHERE id = ? AND used_at IS NULL')
    .bind(usedAt, params.usedByUserId, params.inviteId)
    .run()

  return usedAt
}

export async function upsertFamilyMember(db: D1Database, params: {
  familyId: string
  userId: string
  role: FamilyRole
}) {
  const createdAt = nowIso()
  await db
    .prepare(
      'INSERT INTO family_members (family_id, user_id, role, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(family_id, user_id) DO UPDATE SET role = excluded.role'
    )
    .bind(params.familyId, params.userId, params.role, createdAt)
    .run()
}

export async function listChildren(db: D1Database, familyId: string) {
  const { results } = await db
    .prepare('SELECT id, name, emoji, color FROM children WHERE family_id = ? ORDER BY created_at ASC')
    .bind(familyId)
    .all<{ id: string; name: string; emoji: string | null; color: string | null }>()
  return results
}

export async function createChild(db: D1Database, params: {
  familyId: string
  name: string
  emoji?: string
  color?: string
}) {
  const id = crypto.randomUUID()
  const createdAt = nowIso()

  await db
    .prepare('INSERT INTO children (id, family_id, name, emoji, color, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, params.familyId, params.name, params.emoji ?? null, params.color ?? null, createdAt)
    .run()

  return { id, name: params.name, emoji: params.emoji ?? null, color: params.color ?? null }
}

export async function updateChild(db: D1Database, params: {
  familyId: string
  childId: string
  name?: string
  emoji?: string
  color?: string
}) {
  const updates: string[] = []
  const values: unknown[] = []

  if (typeof params.name === 'string') {
    updates.push('name = ?')
    values.push(params.name)
  }
  if (typeof params.emoji === 'string') {
    updates.push('emoji = ?')
    values.push(params.emoji)
  }
  if (typeof params.color === 'string') {
    updates.push('color = ?')
    values.push(params.color)
  }

  if (updates.length === 0) {
    return { updated: false }
  }

  values.push(params.childId)
  values.push(params.familyId)

  const sql = `UPDATE children SET ${updates.join(', ')} WHERE id = ? AND family_id = ?`
  const res = await db.prepare(sql).bind(...values).run()

  return { updated: res.success }
}

export async function deleteChild(db: D1Database, params: { familyId: string; childId: string }) {
  const res = await db
    .prepare('DELETE FROM children WHERE id = ? AND family_id = ?')
    .bind(params.childId, params.familyId)
    .run()

  return { deleted: res.success }
}

export async function listRecords(db: D1Database, params: {
  familyId: string
  childId?: string
  since?: string
  limit: number
}) {
  const where: string[] = ['family_id = ?', 'deleted_at IS NULL']
  const binds: unknown[] = [params.familyId]

  if (params.childId) {
    where.push('child_id = ?')
    binds.push(params.childId)
  }

  if (params.since) {
    where.push('updated_at > ?')
    binds.push(params.since)
  }

  binds.push(params.limit)

  const sql = `SELECT id, child_id as childId, type, time, payload_json as payloadJson, created_by_user_id as createdByUserId, created_at as createdAt, updated_at as updatedAt
              FROM records
              WHERE ${where.join(' AND ')}
              ORDER BY time DESC
              LIMIT ?`

  const { results } = await db.prepare(sql).bind(...binds).all()
  return results as Array<Record<string, unknown>>
}

export async function createRecord(db: D1Database, params: {
  familyId: string
  childId: string
  type: string
  time: string
  payloadJson: string
  createdByUserId: string
}) {
  const id = crypto.randomUUID()
  const now = nowIso()

  await db
    .prepare(
      'INSERT INTO records (id, family_id, child_id, type, time, payload_json, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, params.familyId, params.childId, params.type, params.time, params.payloadJson, params.createdByUserId, now, now)
    .run()

  return { id }
}

export async function updateRecord(db: D1Database, params: {
  familyId: string
  recordId: string
  payloadJson: string
  userId: string
  canEditAny: boolean
}) {
  const now = nowIso()
  const sql = params.canEditAny
    ? 'UPDATE records SET payload_json = ?, updated_at = ? WHERE id = ? AND family_id = ? AND deleted_at IS NULL'
    : 'UPDATE records SET payload_json = ?, updated_at = ? WHERE id = ? AND family_id = ? AND created_by_user_id = ? AND deleted_at IS NULL'

  const statement = db.prepare(sql)
  const res = params.canEditAny
    ? await statement.bind(params.payloadJson, now, params.recordId, params.familyId).run()
    : await statement.bind(params.payloadJson, now, params.recordId, params.familyId, params.userId).run()

  return { updated: res.success }
}

export async function deleteRecord(db: D1Database, params: {
  familyId: string
  recordId: string
  userId: string
  canDeleteAny: boolean
}) {
  const now = nowIso()
  const sql = params.canDeleteAny
    ? 'UPDATE records SET deleted_at = ?, updated_at = ? WHERE id = ? AND family_id = ? AND deleted_at IS NULL'
    : 'UPDATE records SET deleted_at = ?, updated_at = ? WHERE id = ? AND family_id = ? AND created_by_user_id = ? AND deleted_at IS NULL'

  const statement = db.prepare(sql)
  const res = params.canDeleteAny
    ? await statement.bind(now, now, params.recordId, params.familyId).run()
    : await statement.bind(now, now, params.recordId, params.familyId, params.userId).run()

  return { deleted: res.success }
}
