import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { safeJsonParse } from '@/services/api'
import * as recordService from '@/services/recordService'
import { feverMeds } from '@/config/medications'
import { useUserStore } from './user'
import { useFamilyStore } from './family'
import { useChildrenStore } from './children'

export const useRecordsStore = defineStore('records', () => {
  const recordsByChild = ref({})

  // 注意：不在顶层缓存其他 store 的引用，避免初始化顺序问题
  // 在需要时动态获取 store

  /**
   * 当前孩子的所有记录
   */
  const currentRecords = computed(() => {
    const childrenStore = useChildrenStore()
    if (!childrenStore.currentChild) return []
    return recordsByChild.value[childrenStore.currentChild] || []
  })

  /**
   * 最后一次退烧药记录
   */
  const lastFeverMed = computed(() => {
    return currentRecords.value
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

    const todayRecords = currentRecords.value.filter(
      r => new Date(r.time) >= today
    )

    const medCount = todayRecords.filter(r => r.type === 'med').length
    const coughCount = todayRecords.filter(r => r.type === 'cough').length

    const tempRecords = currentRecords.value
      .filter(r => r.type === 'temp' || (r.type === 'med' && r.temp))
      .sort((a, b) => new Date(b.time) - new Date(a.time))

    const lastTemp = tempRecords.length > 0
      ? (tempRecords[0].temp || tempRecords[0].value)
      : null

    return { medCount, coughCount, lastTemp }
  })

  /**
   * 加载记录
   */
  const loadRecords = async ({ familyId, childId, since, limit } = {}) => {
    const result = await recordService.getRecords({ familyId, childId, since, limit })

    const rows = Array.isArray(result) ? result : []
    const normalized = rows.map(row => {
      const payload = typeof row.payloadJson === 'string' ? safeJsonParse(row.payloadJson) : row.payload
      return {
        id: row.id,
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
  }

  /**
   * 添加记录
   */
  const addRecord = async (type, payload) => {
    const userStore = useUserStore()
    const familyStore = useFamilyStore()
    const childrenStore = useChildrenStore()

    const familyId = familyStore.currentFamilyId
    const childId = childrenStore.currentChild

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

    const localRecord = {
      id: created.id,
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
    const childrenStore = useChildrenStore()

    const familyId = familyStore.currentFamilyId
    if (!familyId) throw new Error('Missing family')

    await recordService.deleteRecord({ recordId, familyId })

    const childId = childrenStore.currentChild
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

    const childrenStore = useChildrenStore()

    let report = `=== ${t('export.reportTitle')} ===\n`
    report += `${t('export.exportedAt')}: ${new Date().toLocaleString(locale)}\n\n`

    childrenStore.children.forEach(child => {
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
   */
  const getTempData = (hours = 24) => {
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    return currentRecords.value
      .filter(r => (r.type === 'temp' || (r.type === 'med' && r.temp)) &&
                   new Date(r.time).getTime() >= cutoff)
      .map(r => ({
        time: new Date(r.time),
        value: r.type === 'temp' ? r.value : r.temp
      }))
      .sort((a, b) => a.time - b.time)
  }

  /**
   * 获取咳嗽统计数据
   */
  const getCoughData = (days = 3, t) => {
    const translate = typeof t === 'function' ? t : (key) => key

    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const count = currentRecords.value.filter(
        r => r.type === 'cough' &&
             new Date(r.time) >= date &&
             new Date(r.time) < nextDate
      ).length

      const labelKey = i === 0 ? 'common.today' : (i === 1 ? 'common.yesterday' : 'common.dayBeforeYesterday')

      result.push({
        label: translate(labelKey),
        count
      })
    }
    return result
  }

  /**
   * 获取恢复统计
   */
  const getRecoveryStats = () => {
    const allRecords = currentRecords.value
    if (allRecords.length === 0) {
      return { totalDays: 0, totalMeds: 0, avgCough: 0 }
    }

    const dates = new Set(allRecords.map(r =>
      new Date(r.time).toDateString()
    ))
    const totalDays = dates.size
    const totalMeds = allRecords.filter(r => r.type === 'med').length
    const coughCount = allRecords.filter(r => r.type === 'cough').length
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
    currentRecords,
    lastFeverMed,
    timeSinceLastFeverMed,
    todayStats,

    loadRecords,
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
