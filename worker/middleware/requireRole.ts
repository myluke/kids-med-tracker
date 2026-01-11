import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../types'
import { getFamilyRole } from '../db/queries'
import { fail } from '../utils/http'

export function requireFamilyRoleFromQuery(allowedRoles: Array<'owner' | 'member'>): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) return fail(c, 401, 'UNAUTHENTICATED', 'Missing user')

    const familyId = c.req.query('familyId')
    if (!familyId) return fail(c, 400, 'BAD_REQUEST', 'Missing familyId')

    const role = await getFamilyRole(c.env.DB, { familyId, userId: user.id })
    if (!role) return fail(c, 403, 'FORBIDDEN', 'Not a family member')

    if (!allowedRoles.includes(role)) {
      return fail(c, 403, 'FORBIDDEN', 'Insufficient role')
    }

    c.set('familyId', familyId)
    c.set('familyRole', role)

    await next()
  }
}
