import { apiFetch } from './api'

/**
 * 获取孩子列表
 * @param {Object} params
 * @param {string} params.familyId - 家庭 ID
 * @returns {Promise<Array>} 孩子列表
 */
export async function getChildren({ familyId }) {
  return apiFetch('/api/children', {
    query: { familyId }
  })
}

/**
 * 创建孩子
 * @param {Object} params
 * @param {string} params.familyId - 家庭 ID
 * @param {string} params.name - 名字
 * @param {string} params.emoji - 头像 emoji
 * @param {string} params.color - 主题色
 * @param {string} params.gender - 性别
 * @param {number} params.age - 年龄
 * @returns {Promise<Object>} 创建的孩子对象
 */
export async function createChild({ familyId, name, emoji, color, gender, age }) {
  return apiFetch('/api/children', {
    method: 'POST',
    json: { familyId, name, emoji, color, gender, age }
  })
}

/**
 * 更新孩子信息
 * @param {Object} params
 * @param {string} params.childId - 孩子 ID
 * @param {string} params.familyId - 家庭 ID
 * @param {string} [params.name] - 名字
 * @param {string} [params.emoji] - 头像 emoji
 * @param {string} [params.color] - 主题色
 * @param {string} [params.gender] - 性别
 * @param {number} [params.age] - 年龄
 * @returns {Promise<void>}
 */
export async function updateChild({ childId, familyId, name, emoji, color, gender, age }) {
  return apiFetch(`/api/children/${childId}`, {
    method: 'PATCH',
    json: { familyId, name, emoji, color, gender, age }
  })
}

/**
 * 删除孩子
 * @param {Object} params
 * @param {string} params.childId - 孩子 ID
 * @param {string} params.familyId - 家庭 ID
 * @returns {Promise<void>}
 */
export async function deleteChild({ childId, familyId }) {
  return apiFetch(`/api/children/${childId}`, {
    method: 'DELETE',
    query: { familyId }
  })
}
