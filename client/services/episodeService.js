import { apiFetch } from './api'

/**
 * 获取病程列表
 * @param {Object} params
 * @param {string} params.familyId - 家庭 ID
 * @param {string} params.childId - 孩子 ID
 * @param {string} [params.status] - 状态过滤 (active/recovered/all)
 * @param {number} [params.limit] - 数量限制
 * @returns {Promise<Array>} 病程列表
 */
export async function getEpisodes({ familyId, childId, status, limit }) {
  return apiFetch('/api/episodes', {
    query: { familyId, childId, status, limit }
  })
}

/**
 * 获取当前活跃病程
 * @param {Object} params
 * @param {string} params.familyId - 家庭 ID
 * @param {string} params.childId - 孩子 ID
 * @returns {Promise<Object|null>} 活跃病程或 null
 */
export async function getActiveEpisode({ familyId, childId }) {
  return apiFetch('/api/episodes/active', {
    query: { familyId, childId }
  })
}

/**
 * 标记病程痊愈
 * @param {Object} params
 * @param {string} params.episodeId - 病程 ID
 * @param {string} params.familyId - 家庭 ID
 * @returns {Promise<Object>} 更新后的病程对象
 */
export async function endEpisode({ episodeId, familyId }) {
  return apiFetch(`/api/episodes/${episodeId}/end`, {
    method: 'POST',
    json: { familyId }
  })
}

/**
 * 获取病程统计
 * @param {Object} params
 * @param {string} params.episodeId - 病程 ID
 * @param {string} params.familyId - 家庭 ID
 * @returns {Promise<Object>} 统计数据
 */
export async function getEpisodeStats({ episodeId, familyId }) {
  return apiFetch(`/api/episodes/${episodeId}/stats`, {
    query: { familyId }
  })
}
