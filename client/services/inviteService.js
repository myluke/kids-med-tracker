import { apiFetch } from './api'

/**
 * 创建家庭邀请链接
 * @param {Object} params
 * @param {string} params.familyId - 家庭 ID
 * @returns {Promise<Object>} 包含邀请 token 的对象
 */
export async function createInvite({ familyId }) {
  return apiFetch('/api/invites', {
    method: 'POST',
    json: { familyId }
  })
}

/**
 * 接受家庭邀请
 * @param {Object} params
 * @param {string} params.token - 邀请 token
 * @returns {Promise<Object>} 包含 familyId 的对象
 */
export async function acceptInvite({ token }) {
  return apiFetch('/api/invites/accept', {
    method: 'POST',
    json: { token }
  })
}
