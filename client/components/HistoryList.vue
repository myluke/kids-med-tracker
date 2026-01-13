<script setup>
import { ref, computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore, useFamilyStore, useRecordsStore } from '@/stores'

const userStore = useUserStore()
const familyStore = useFamilyStore()
const recordsStore = useRecordsStore()
const toast = inject('toast')
const { t, locale } = useI18n()

const currentFilter = ref('all')
const filters = [
  { key: 'all' },
  { key: 'med' },
  { key: 'cough' }
]

const filteredRecords = computed(() => {
  let records = [...recordsStore.currentRecords].sort((a, b) =>
    new Date(b.time) - new Date(a.time)
  )

  if (currentFilter.value !== 'all') {
    records = records.filter(r => r.type === currentFilter.value)
  }

  return records.slice(0, 20)
})

const formatTime = (isoString) => {
  const date = new Date(isoString)
  return {
    date: date.toLocaleDateString(locale.value, { month: 'numeric', day: 'numeric' }),
    time: date.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
  }
}

const getRecordDisplay = (record) => {
  switch (record.type) {
    case 'med':
      return {
        icon: '💊',
        iconBg: 'bg-dabo-light',
        main: record.drug,
        sub: record.dosage + (record.temp ? t('history.record.medTemp', { temp: record.temp }) : '')
      }
    case 'cough':
      return {
        icon: '🫁',
        iconBg: 'bg-mint-light',
        main: t('history.record.coughMain', { level: record.level }),
        sub: record.note || ''
      }
    case 'temp':
      return {
        icon: '🌡️',
        iconBg: 'bg-erbao-light',
        main: t('history.record.tempMain', { value: record.value }),
        sub: record.value >= 38.5 ? t('history.record.tempStatus.fever') : (record.value >= 37.3 ? t('history.record.tempStatus.lowFever') : t('history.record.tempStatus.normal'))
      }
    case 'note':
      return {
        icon: '📝',
        iconBg: 'bg-dabo-light',
        main: t('history.record.note'),
        sub: record.content
      }
    default:
      return { icon: '📋', iconBg: 'bg-gray-100', main: t('history.record.default'), sub: '' }
  }
}

const canDeleteRecord = (record) => {
  if (familyStore.isOwner) return true
  if (!userStore.user) return false
  return record.createdByUserId === userStore.user.id
}

const deleteRecord = (recordId) => {
  if (!recordId) return
  if (confirm(t('confirm.deleteRecord'))) {
    recordsStore.deleteRecordById(recordId)
    toast(t('toast.deleted'))
  }
}
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <span class="font-semibold text-gray-800">{{ t('history.title') }}</span>
      <div class="flex gap-2">
        <button
          v-for="filter in filters"
          :key="filter.key"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          :class="currentFilter === filter.key 
            ? 'bg-dabo text-white' 
            : 'bg-warm-50 text-gray-500'"
          @click="currentFilter = filter.key"
        >
          {{ t(`history.filter.${filter.key}`) }}
        </button>
      </div>
    </div>

    <div class="max-h-96 overflow-y-auto -mx-5 px-5">
      <!-- 空状态 -->
      <div
        v-if="filteredRecords.length === 0"
        class="text-center py-10 text-gray-400"
      >
        <div class="text-4xl mb-3">
          📝
        </div>
        <div>{{ t('history.empty') }}</div>
      </div>

      <!-- 记录列表 -->
      <div
        v-for="record in filteredRecords"
        :key="record.id || (record.time + record.type)"
        class="flex items-start py-3.5 border-b border-gray-100 last:border-0"
      >
        <div 
          class="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 mr-3"
          :class="getRecordDisplay(record).iconBg"
        >
          {{ getRecordDisplay(record).icon }}
        </div>
        
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-800 text-sm">
            {{ getRecordDisplay(record).main }}
          </div>
          <div class="text-xs text-gray-500 truncate">
            {{ getRecordDisplay(record).sub }}
          </div>
        </div>
        
        <div class="text-right text-xs text-gray-400 flex-shrink-0 ml-2">
          <div>{{ formatTime(record.time).date }}</div>
          <div>{{ formatTime(record.time).time }}</div>
        </div>

        <button
          v-if="canDeleteRecord(record)"
          class="ml-2 px-2 py-1 text-gray-300 hover:text-erbao transition-colors"
          @click="deleteRecord(record.id)"
        >
          &times;
        </button>
      </div>
    </div>
  </div>
</template>
