import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const medications = [
  { name: '布洛芬', icon: '🔥', isFeverMed: true, interval: 6 },
  { name: '对乙酰氨基酚', icon: '💧', isFeverMed: true, interval: 4 },
  { name: '奥司他韦', icon: '💊', isFeverMed: false, interval: 12 },
  { name: '止咳糖浆', icon: '🍯', isFeverMed: false, interval: 0 },
  { name: '小儿氨酚黄那敏', icon: '🌿', isFeverMed: false, interval: 0 },
  { name: '其他', icon: '➕', isFeverMed: false, interval: 0 }
]

export const feverMeds = medications.filter(m => m.isFeverMed).map(m => m.name)

async function apiFetch(path, { method = 'GET', json, query, headers } = {}) {
  const url = new URL(path, window.location.origin)
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      url.searchParams.set(k, String(v))
    })
  }

  // 从 Supabase 获取 access token
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  const requestHeaders = {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(headers || {})
  }

  const res = await fetch(url.toString(), {
    method,
    headers: requestHeaders,
    body: json ? JSON.stringify(json) : undefined
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    if (isJson && data && data.error) {
      const message = data.error.message || data.error.code || 'Request failed'
      throw new Error(message)
    }
    throw new Error(typeof data === 'string' ? data : 'Request failed')
  }

  if (isJson && data && data.ok === false) {
    throw new Error(data.error?.message || 'Request failed')
  }

  return isJson && data && data.ok === true ? data.data : data
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function clampByte(n) {
  return Math.max(0, Math.min(255, n))
}

function hexToRgb(hex) {
  const value = hex.replace('#', '').trim()
  if (value.length !== 6) return null
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return null
  return { r, g, b }
}

function rgbToHex({ r, g, b }) {
  return (
    '#' +
    clampByte(r).toString(16).padStart(2, '0') +
    clampByte(g).toString(16).padStart(2, '0') +
    clampByte(b).toString(16).padStart(2, '0')
  )
}

function lightenHex(hex, ratio = 0.85) {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#FFFFFF'
  return rgbToHex({
    r: Math.round(rgb.r + (255 - rgb.r) * ratio),
    g: Math.round(rgb.g + (255 - rgb.g) * ratio),
    b: Math.round(rgb.b + (255 - rgb.b) * ratio)
  })
}

export const useRecordsStore = defineStore('records', () => {
  const user = ref(null)
  const families = ref([])
  const currentFamilyId = ref(null)

  const children = ref([])
  const currentChild = ref(null)

  const recordsByChild = ref({})

  const initialized = ref(false)
  const loading = ref({
    bootstrap: false
  })

  const error = ref(null)

  const currentFamilyRole = computed(() => {
    if (!currentFamilyId.value) return null
    const family = families.value.find(f => f.id === currentFamilyId.value)
    return family?.role || null
  })

  const isOwner = computed(() => currentFamilyRole.value === 'owner')

  const currentRecords = computed(() => {
    if (!currentChild.value) return []
    return recordsByChild.value[currentChild.value] || []
  })

  const bootstrap = async () => {
    if (loading.value.bootstrap) return
    loading.value.bootstrap = true

    try {
      error.value = null

      const me = await apiFetch('/api/auth/me')
      user.value = me.user
      families.value = me.families || []

      // 用户未登录则直接返回
      if (!user.value) {
        initialized.value = true
        return
      }

      if (!currentFamilyId.value && families.value.length > 0) {
        currentFamilyId.value = families.value[0].id
      }

      if (currentFamilyId.value) {
        await loadChildren(currentFamilyId.value)
      }

      if (!currentChild.value && children.value.length > 0) {
        currentChild.value = children.value[0].id
      }

      if (currentFamilyId.value && currentChild.value) {
        await loadRecords({
          familyId: currentFamilyId.value,
          childId: currentChild.value
        })
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value.bootstrap = false
      initialized.value = true
    }
  }

  const setFamily = async (familyId) => {
    currentFamilyId.value = familyId
    children.value = []
    currentChild.value = null
    recordsByChild.value = {}

    await loadChildren(familyId)

    if (children.value.length > 0) {
      currentChild.value = children.value[0].id
      await loadRecords({ familyId, childId: currentChild.value })
    }
  }


  const loadChildren = async (familyId) => {
    const result = await apiFetch('/api/children', {
      query: { familyId }
    })

    const list = Array.isArray(result) ? result : []
    children.value = list.map(c => ({
      ...c,
      lightColor: c.lightColor || lightenHex(c.color || '#4A90D9')
    }))
  }

  const createChild = async ({ name, emoji, color }) => {
    if (!currentFamilyId.value) throw new Error('Missing family')

    const child = await apiFetch('/api/children', {
      method: 'POST',
      json: {
        familyId: currentFamilyId.value,
        name,
        emoji,
        color
      }
    })

    await loadChildren(currentFamilyId.value)

    if (!currentChild.value && child?.id) {
      currentChild.value = child.id
    }

    return child
  }

  const loadRecords = async ({ familyId, childId, since, limit } = {}) => {
    const result = await apiFetch('/api/records', {
      query: { familyId, childId, since, limit }
    })

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

  const createFamily = async ({ name }) => {
    const family = await apiFetch('/api/families', {
      method: 'POST',
      json: { name }
    })

    await bootstrap()

    if (family?.id) {
      await setFamily(family.id)
    }

    return family
  }

  const createInvite = async ({ familyId }) => {
    return apiFetch('/api/invites', {
      method: 'POST',
      json: { familyId }
    })
  }

  const acceptInvite = async ({ token }) => {
    const res = await apiFetch('/api/invites/accept', {
      method: 'POST',
      json: { token }
    })

    await bootstrap()
    if (res?.familyId) {
      await setFamily(res.familyId)
    }

    return res
  }

  const switchChild = async (childId) => {
    currentChild.value = childId

    if (!currentFamilyId.value) return

    if (!recordsByChild.value[childId]) {
      await loadRecords({ familyId: currentFamilyId.value, childId })
    }
  }

  const addRecord = async (type, payload) => {
    if (!currentFamilyId.value || !currentChild.value) {
      throw new Error('Missing family or child')
    }

    const now = new Date().toISOString()

    const created = await apiFetch('/api/records', {
      method: 'POST',
      json: {
        familyId: currentFamilyId.value,
        childId: currentChild.value,
        type,
        time: now,
        payload
      }
    })

    const localRecord = {
      id: created.id,
      type,
      time: now,
      createdByUserId: user.value?.id,
      ...(payload || {})
    }

    recordsByChild.value = {
      ...recordsByChild.value,
      [currentChild.value]: [localRecord, ...(recordsByChild.value[currentChild.value] || [])]
    }

    return localRecord
  }

  const addMedRecord = (drug, dosage, temp = null) => {
    return addRecord('med', { drug, dosage, temp })
  }

  const addCoughRecord = (level, note = '') => {
    return addRecord('cough', { level, note })
  }

  const addTempRecord = (value) => {
    return addRecord('temp', { value })
  }

  const addNote = (content) => {
    return addRecord('note', { content })
  }

  const deleteRecordById = async (recordId) => {
    if (!currentFamilyId.value) throw new Error('Missing family')

    await apiFetch(`/api/records/${recordId}`, {
      method: 'DELETE',
      query: { familyId: currentFamilyId.value }
    })

    const childId = currentChild.value
    if (!childId) return

    recordsByChild.value = {
      ...recordsByChild.value,
      [childId]: (recordsByChild.value[childId] || []).filter(r => r.id !== recordId)
    }
  }

  const lastFeverMed = computed(() => {
    return currentRecords.value
      .filter(r => r.type === 'med' && feverMeds.includes(r.drug))
      .sort((a, b) => new Date(b.time) - new Date(a.time))[0] || null
  })

  const timeSinceLastFeverMed = computed(() => {
    if (!lastFeverMed.value) return null
    return Date.now() - new Date(lastFeverMed.value.time).getTime()
  })

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

  // ============== 认证相关方法 ==============

  /**
   * 登出
   */
  const logout = async () => {
    // 先登出 Supabase
    await supabase.auth.signOut()

    // 通知后端
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // 忽略错误，本地状态已清除
    }

    // 清除本地状态
    user.value = null
    families.value = []
    currentFamilyId.value = null
    children.value = []
    currentChild.value = null
    recordsByChild.value = {}
  }

  // 不自动执行 bootstrap，由路由守卫控制
  // bootstrap()

  return {
    user,
    families,
    currentFamilyId,
    currentFamilyRole,
    isOwner,
    children,
    currentChild,

    initialized,
    loading,
    error,

    currentRecords,
    lastFeverMed,
    timeSinceLastFeverMed,
    todayStats,

    bootstrap,
    setFamily,
    createFamily,
    createInvite,
    acceptInvite,

    // 认证相关
    logout,

    switchChild,
    loadChildren,
    createChild,
    loadRecords,

    addMedRecord,
    addCoughRecord,
    addTempRecord,
    addNote,
    deleteRecordById,

    exportRecords,
    getTempData,
    getCoughData,
    getRecoveryStats
  }
})
