import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// 孩子配置 - 可自定义
export const children = [
  { 
    id: 'child1', 
    name: '大宝', 
    age: '8岁', 
    gender: 'boy',
    emoji: '👦',
    color: '#4A90D9',
    lightColor: '#E8F2FC'
  },
  { 
    id: 'child2', 
    name: '二宝', 
    age: '2岁', 
    gender: 'girl',
    emoji: '👧',
    color: '#E85D75',
    lightColor: '#FDE8EC'
  }
]

// 预设药物
export const medications = [
  { name: '布洛芬', icon: '🔥', isFeverMed: true, interval: 6 },
  { name: '对乙酰氨基酚', icon: '💧', isFeverMed: true, interval: 4 },
  { name: '奥司他韦', icon: '💊', isFeverMed: false, interval: 12 },
  { name: '止咳糖浆', icon: '🍯', isFeverMed: false, interval: 0 },
  { name: '小儿氨酚黄那敏', icon: '🌿', isFeverMed: false, interval: 0 },
  { name: '其他', icon: '➕', isFeverMed: false, interval: 0 }
]

// 退烧药名单
export const feverMeds = medications.filter(m => m.isFeverMed).map(m => m.name)

// 存储键名
const STORAGE_KEY = 'kids-med-tracker'

export const useRecordsStore = defineStore('records', () => {
  // 当前选中的孩子
  const currentChild = ref('child1')

  // 所有记录数据
  const records = ref({})

  // 初始化数据
  const initData = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        records.value = JSON.parse(stored)
      } catch (e) {
        records.value = {}
      }
    }
    // 确保每个孩子都有记录数组
    children.forEach(child => {
      if (!records.value[child.id]) {
        records.value[child.id] = []
      }
    })
  }

  // 保存数据到localStorage
  const saveData = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value))
  }

  // 监听变化自动保存
  watch(records, saveData, { deep: true })

  // 初始化
  initData()

  // 当前孩子的记录
  const currentRecords = computed(() => {
    return records.value[currentChild.value] || []
  })

  // 切换孩子
  const switchChild = (childId) => {
    currentChild.value = childId
  }

  // 添加用药记录
  const addMedRecord = (drug, dosage, temp = null) => {
    records.value[currentChild.value].push({
      type: 'med',
      drug,
      dosage,
      temp,
      time: new Date().toISOString()
    })
  }

  // 添加咳嗽记录
  const addCoughRecord = (level, note = '') => {
    records.value[currentChild.value].push({
      type: 'cough',
      level,
      note,
      time: new Date().toISOString()
    })
  }

  // 添加体温记录
  const addTempRecord = (value) => {
    records.value[currentChild.value].push({
      type: 'temp',
      value,
      time: new Date().toISOString()
    })
  }

  // 添加备注
  const addNote = (content) => {
    records.value[currentChild.value].push({
      type: 'note',
      content,
      time: new Date().toISOString()
    })
  }

  // 删除记录
  const deleteRecord = (index) => {
    const sorted = [...currentRecords.value].sort((a, b) => 
      new Date(b.time) - new Date(a.time)
    )
    const target = sorted[index]
    const originalIndex = records.value[currentChild.value].findIndex(
      r => r.time === target.time && r.type === target.type
    )
    if (originalIndex !== -1) {
      records.value[currentChild.value].splice(originalIndex, 1)
    }
  }

  // 获取最近的退烧药记录
  const lastFeverMed = computed(() => {
    return currentRecords.value
      .filter(r => r.type === 'med' && feverMeds.includes(r.drug))
      .sort((a, b) => new Date(b.time) - new Date(a.time))[0] || null
  })

  // 计算距上次退烧药的时间（毫秒）
  const timeSinceLastFeverMed = computed(() => {
    if (!lastFeverMed.value) return null
    return Date.now() - new Date(lastFeverMed.value.time).getTime()
  })

  // 今日统计
  const todayStats = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayRecords = currentRecords.value.filter(
      r => new Date(r.time) >= today
    )

    const medCount = todayRecords.filter(r => r.type === 'med').length
    const coughCount = todayRecords.filter(r => r.type === 'cough').length
    
    // 最近体温
    const tempRecords = currentRecords.value
      .filter(r => r.type === 'temp' || (r.type === 'med' && r.temp))
      .sort((a, b) => new Date(b.time) - new Date(a.time))
    
    const lastTemp = tempRecords.length > 0 
      ? (tempRecords[0].temp || tempRecords[0].value) 
      : null

    return { medCount, coughCount, lastTemp }
  })

  // 导出记录为文本
  const exportRecords = () => {
    let report = '=== 宝贝康复记录 ===\n'
    report += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`

    children.forEach(child => {
      const childRecords = records.value[child.id] || []
      const sorted = [...childRecords].sort((a, b) => 
        new Date(b.time) - new Date(a.time)
      )

      report += `【${child.name}】\n`
      report += '-'.repeat(30) + '\n'

      sorted.forEach(r => {
        const time = new Date(r.time).toLocaleString('zh-CN')
        if (r.type === 'med') {
          report += `${time} | 用药：${r.drug} ${r.dosage}${r.temp ? ' 体温' + r.temp + '°' : ''}\n`
        } else if (r.type === 'cough') {
          report += `${time} | 咳嗽：${r.level}${r.note ? ' (' + r.note + ')' : ''}\n`
        } else if (r.type === 'temp') {
          report += `${time} | 体温：${r.value}°\n`
        } else if (r.type === 'note') {
          report += `${time} | 备注：${r.content}\n`
        }
      })
      report += '\n'
    })

    return report
  }

  // 获取体温数据（用于图表）
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

  // 获取咳嗽数据（用于图表）
  const getCoughData = (days = 3) => {
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

      result.push({
        label: i === 0 ? '今天' : (i === 1 ? '昨天' : '前天'),
        count
      })
    }
    return result
  }

  // 获取康复统计
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

  return {
    // State
    currentChild,
    records,
    
    // Getters
    currentRecords,
    lastFeverMed,
    timeSinceLastFeverMed,
    todayStats,
    
    // Actions
    switchChild,
    addMedRecord,
    addCoughRecord,
    addTempRecord,
    addNote,
    deleteRecord,
    exportRecords,
    getTempData,
    getCoughData,
    getRecoveryStats
  }
})
