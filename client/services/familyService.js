import { apiFetch } from './api'

/**
 * 创建家庭
 * @param {Object} params
 * @param {string} params.name - 家庭名称
 * @returns {Promise<Object>} 创建的家庭对象
 */
export async function createFamily({ name }) {
  return apiFetch('/api/families', {
    method: 'POST',
    json: { name }
  })
}

/**
 * 删除家庭
 * @param {Object} params
 * @param {string} params.familyId - 家庭 ID
 * @returns {Promise<Object>}
 */
export async function deleteFamily({ familyId }) {
  return apiFetch(`/api/families/${familyId}`, {
    method: 'DELETE'
  })
}
