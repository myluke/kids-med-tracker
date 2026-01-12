import { apiFetch } from './api'

/**
 * 获取记录列表
 * @param {Object} params
 * @param {string} params.familyId - 家庭 ID
 * @param {string} params.childId - 孩子 ID
 * @param {string} [params.since] - 起始时间
 * @param {number} [params.limit] - 数量限制
 * @returns {Promise<Array>} 记录列表
 */
export async function getRecords({ familyId, childId, since, limit }) {
  return apiFetch('/api/records', {
    query: { familyId, childId, since, limit }
  })
}

/**
 * 创建记录
 * @param {Object} params
 * @param {string} params.familyId - 家庭 ID
 * @param {string} params.childId - 孩子 ID
 * @param {string} params.type - 记录类型 (med/cough/temp/note)
 * @param {string} params.time - 记录时间 (ISO 格式)
 * @param {Object} params.payload - 记录内容
 * @returns {Promise<Object>} 创建的记录对象
 */
export async function createRecord({ familyId, childId, type, time, payload }) {
  return apiFetch('/api/records', {
    method: 'POST',
    json: { familyId, childId, type, time, payload }
  })
}

/**
 * 删除记录
 * @param {Object} params
 * @param {string} params.recordId - 记录 ID
 * @param {string} params.familyId - 家庭 ID
 * @returns {Promise<void>}
 */
export async function deleteRecord({ recordId, familyId }) {
  return apiFetch(`/api/records/${recordId}`, {
    method: 'DELETE',
    query: { familyId }
  })
}
