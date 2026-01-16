import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'
import { safeJsonParse } from '@/services/api'
import * as recordService from '@/services/recordService'
import { feverMeds } from '@/config/medications'
import { useUserStore } from './user'
import { useFamilyStore } from './family'
import { useChildrenStore } from './children'
import { useEpisodesStore } from './episodes'

export const useRecordsStore = defineStore('records', () => {
  const recordsByChild = ref({})
  const loading = ref(false)

  // 在 setup 顶层获取其他 store，使用 storeToRefs 确保响应式追踪正确
  const childrenStore = useChildrenStore()
  const { currentChild, children } = storeToRefs(childrenStore)

  /**
   * 当前孩子的所有记录
   */
  const currentRecords = computed(() => {
    if (!currentChild.value) return []
    return recordsByChild.value[currentChild.value] || []
  })

  /**
   * 当前病程的记录
   */
  const currentEpisodeRecords = computed(() => {
    const episodesStore = useEpisodesStore()
    const episode = episodesStore.activeEpisode
    if (!episode) return currentRecords.value
    return currentRecords.value.filter(r => r.episodeId === episode.id)
  })

  /**
   * 最后一次退烧药记录（仅当前病程）
   */
  const lastFeverMed = computed(() => {
    return currentEpisodeRecords.value
      .filter(r => r.type === 'med' && feverMeds.includes(r.drug))
      .sort((a, b) => new Date(b.time) - new Date(a.time))[0] || null
  })

  /**
   * 距离上次退烧药的时间（毫秒）
   */
  const timeSinceLastFeverMed = computed(() => {
    if (!lastFeverMed.value) return null
    return Date.now() - new Date(lastFeverMed.value.time).getTime()
  })

  /**
   * 今日统计
   */
  const todayStats = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()

    // 单次遍历完成所有统计
    let medCount = 0
    let coughCount = 0
    let lastTemp = null
    let latestTempTime = 0

    for (const r of currentRecords.value) {
      const recordTime = new Date(r.time).getTime()

      // 统计今日记录
      if (recordTime >= todayTime) {
        if (r.type === 'med') medCount++
        else if (r.type === 'cough') coughCount++
      }

      // 查找最新体温
      const hasTemp = r.type === 'temp' || (r.type === 'med' && r.temp)
      if (hasTemp && recordTime > latestTempTime) {
        latestTempTime = recordTime
        lastTemp = r.type === 'temp' ? r.value : r.temp
      }
    }

    return { medCount, coughCount, lastTemp }
  })

  /**
   * 刷新当前孩子的记录（用于下拉刷新）
   */
  const refreshCurrentChildRecords = async () => {
    const familyStore = useFamilyStore()
    const familyId = familyStore.currentFamilyId
    const childId = currentChild.value
    if (!familyId || !childId) return
    return loadRecords({ familyId, childId })
  }

  /**
   * 加载记录
   */
  const loadRecords = async ({ familyId, childId, since, limit } = {}) => {
    loading.value = true
    try {
      const result = await recordService.getRecords({ familyId, childId, since, limit })

      const rows = Array.isArray(result) ? result : []
      const normalized = rows.map(row => {
        const payload = typeof row.payloadJson === 'string' ? safeJsonParse(row.payloadJson) : row.payload
        return {
          id: row.id,
          episodeId: row.episodeId,
          type: row.type,
          time: row.time,
          createdByUserId: row.createdByUserId,
          ...(payload || {})
        }
      })

      recordsByChild.value = {
        ...recordsByChild.value,
        [childId]: normalized
      }

      return normalized
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加记录
   */
  const addRecord = async (type, payload) => {
    const userStore = useUserStore()
    const familyStore = useFamilyStore()
    const episodesStore = useEpisodesStore()

    const familyId = familyStore.currentFamilyId
    const childId = currentChild.value

    if (!familyId || !childId) {
      throw new Error('Missing family or child')
    }

    const now = new Date().toISOString()

    const created = await recordService.createRecord({
      familyId,
      childId,
      type,
      time: now,
      payload
    })

    // Update episodes store with the episode ID
    if (created.episodeId) {
      episodesStore.setActiveEpisodeId(childId, created.episodeId)
      // Reload active episode if we don't have it cached
      if (!episodesStore.activeEpisode || episodesStore.activeEpisode.id !== created.episodeId) {
        await episodesStore.loadActiveEpisode(childId)
      }
    }

    const localRecord = {
      id: created.id,
      episodeId: created.episodeId,
      type,
      time: now,
      createdByUserId: userStore.user?.id,
      ...(payload || {})
    }

    recordsByChild.value = {
      ...recordsByChild.value,
      [childId]: [localRecord, ...(recordsByChild.value[childId] || [])]
    }

    return localRecord
  }

  /**
   * 添加用药记录
   */
  const addMedRecord = (drug, dosage, temp = null) => {
    return addRecord('med', { drug, dosage, temp })
  }

  /**
   * 添加咳嗽记录
   */
  const addCoughRecord = (level, note = '') => {
    return addRecord('cough', { level, note })
  }

  /**
   * 添加体温记录
   */
  const addTempRecord = (value) => {
    return addRecord('temp', { value })
  }

  /**
   * 添加备注
   */
  const addNote = (content) => {
    return addRecord('note', { content })
  }

  /**
   * 删除记录
   */
  const deleteRecordById = async (recordId) => {
    const familyStore = useFamilyStore()

    const familyId = familyStore.currentFamilyId
    if (!familyId) throw new Error('Missing family')

    await recordService.deleteRecord({ recordId, familyId })

    const childId = currentChild.value
    if (!childId) return

    recordsByChild.value = {
      ...recordsByChild.value,
      [childId]: (recordsByChild.value[childId] || []).filter(r => r.id !== recordId)
    }
  }

  /**
   * 清除指定孩子的记录缓存
   */
  const clearChildRecords = (childId) => {
    if (recordsByChild.value[childId]) {
      // eslint-disable-next-line no-unused-vars
      const { [childId]: _removed, ...rest } = recordsByChild.value
      recordsByChild.value = rest
    }
  }

  /**
   * 导出记录为文本
   */
  const exportRecords = ({ locale = 'zh-CN', t } = {}) => {
    if (typeof t !== 'function') return ''

    let report = `=== ${t('export.reportTitle')} ===\n`
    report += `${t('export.exportedAt')}: ${new Date().toLocaleString(locale)}\n\n`

    children.value.forEach(child => {
      const childRecords = recordsByChild.value[child.id] || []
      const sorted = [...childRecords].sort((a, b) =>
        new Date(b.time) - new Date(a.time)
      )

      report += `【${child.name}】\n`
      report += '-'.repeat(30) + '\n'

      sorted.forEach(r => {
        const time = new Date(r.time).toLocaleString(locale)
        if (r.type === 'med') {
          const tempPart = r.temp ? t('export.tempInline', { temp: r.temp }) : ''
          report += `${time} | ${t('export.med')}: ${r.drug} ${r.dosage}${tempPart}\n`
        } else if (r.type === 'cough') {
          report += `${time} | ${t('export.cough')}: ${r.level}${r.note ? ' (' + r.note + ')' : ''}\n`
        } else if (r.type === 'temp') {
          report += `${time} | ${t('export.temp')}: ${r.value}°\n`
        } else if (r.type === 'note') {
          report += `${time} | ${t('export.note')}: ${r.content}\n`
        }
      })
      report += '\n'
    })

    return report
  }

  /**
   * 获取体温数据（用于图表）
   * @param {number} hours - 时间范围（小时）
   * @param {string|null} episodeId - 可选，按病程ID过滤
   */
  const getTempData = (hours = 24, episodeId = null) => {
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    return currentRecords.value
      .filter(r => {
        // 类型过滤
        if (r.type !== 'temp' && !(r.type === 'med' && r.temp)) return false
        // 时间过滤
        if (new Date(r.time).getTime() < cutoff) return false
        // 病程过滤
        if (episodeId && r.episodeId !== episodeId) return false
        return true
      })
      .map(r => ({
        time: new Date(r.time),
        value: r.type === 'temp' ? r.value : r.temp
      }))
      .sort((a, b) => a.time - b.time)
  }

  /**
   * 获取咳嗽统计数据
   * @param {number} days - 天数范围
   * @param {Function} t - 翻译函数
   * @param {string|null} episodeId - 可选，按病程ID过滤
   */
  const getCoughData = (days = 3, t, episodeId = null) => {
    const translate = typeof t === 'function' ? t : (key) => key
    const labelKeys = ['common.dayBeforeYesterday', 'common.yesterday', 'common.today']

    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const startTime = date.getTime()
      const endTime = startTime + 24 * 60 * 60 * 1000

      const count = currentRecords.value.filter(r => {
        if (r.type !== 'cough') return false
        const recordTime = new Date(r.time).getTime()
        if (recordTime < startTime || recordTime >= endTime) return false
        // 病程过滤
        if (episodeId && r.episodeId !== episodeId) return false
        return true
      }).length

      result.push({
        label: translate(labelKeys[days - 1 - i]),
        count
      })
    }
    return result
  }

  /**
   * 获取恢复统计
   * @param {string|null} episodeId - 可选，按病程ID过滤
   */
  const getRecoveryStats = (episodeId = null) => {
    let records = currentRecords.value
    // 病程过滤
    if (episodeId) {
      records = records.filter(r => r.episodeId === episodeId)
    }

    if (records.length === 0) {
      return { totalDays: 0, totalMeds: 0, avgCough: 0 }
    }

    const dates = new Set(records.map(r =>
      new Date(r.time).toDateString()
    ))
    const totalDays = dates.size
    const totalMeds = records.filter(r => r.type === 'med').length
    const coughCount = records.filter(r => r.type === 'cough').length
    const avgCough = totalDays > 0 ? (coughCount / totalDays).toFixed(1) : 0

    return { totalDays, totalMeds, avgCough }
  }

  /**
   * 重置状态
   */
  const reset = () => {
    recordsByChild.value = {}
  }

  return {
    recordsByChild,
    loading,
    currentRecords,
    currentEpisodeRecords,
    lastFeverMed,
    timeSinceLastFeverMed,
    todayStats,

    loadRecords,
    refreshCurrentChildRecords,
    addRecord,
    addMedRecord,
    addCoughRecord,
    addTempRecord,
    addNote,
    deleteRecordById,
    clearChildRecords,

    exportRecords,
    getTempData,
    getCoughData,
    getRecoveryStats,
    reset
  }
})
