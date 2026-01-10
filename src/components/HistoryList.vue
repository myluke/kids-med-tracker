<script setup>
import { ref, computed, inject } from 'vue'
import { useRecordsStore } from '@/stores/records'

const store = useRecordsStore()
const toast = inject('toast')

const currentFilter = ref('all')
const filters = [
  { key: 'all', label: '全部' },
  { key: 'med', label: '用药' },
  { key: 'cough', label: '咳嗽' }
]

const filteredRecords = computed(() => {
  let records = [...store.currentRecords].sort((a, b) => 
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
    date: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
}

const getRecordDisplay = (record) => {
  switch (record.type) {
    case 'med':
      return {
        icon: '💊',
        iconBg: 'bg-blue-100',
        main: record.drug,
        sub: record.dosage + (record.temp ? ` · 体温 ${record.temp}°` : '')
      }
    case 'cough':
      return {
        icon: '🫁',
        iconBg: 'bg-yellow-100',
        main: `咳嗽 - ${record.level}`,
        sub: record.note || ''
      }
    case 'temp':
      return {
        icon: '🌡️',
        iconBg: 'bg-red-100',
        main: `体温 ${record.value}°`,
        sub: record.value >= 38.5 ? '发热' : (record.value >= 37.3 ? '低热' : '正常')
      }
    case 'note':
      return {
        icon: '📝',
        iconBg: 'bg-blue-100',
        main: '备注',
        sub: record.content
      }
    default:
      return { icon: '📋', iconBg: 'bg-gray-100', main: '记录', sub: '' }
  }
}

const deleteRecord = (index) => {
  if (confirm('确定删除这条记录吗？')) {
    store.deleteRecord(index)
    toast('已删除')
  }
}
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <span class="font-semibold text-gray-800">📋 记录历史</span>
      <div class="flex gap-2">
        <button
          v-for="filter in filters"
          :key="filter.key"
          @click="currentFilter = filter.key"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          :class="currentFilter === filter.key 
            ? 'bg-dabo text-white' 
            : 'bg-warm-50 text-gray-500'"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div class="max-h-96 overflow-y-auto -mx-5 px-5">
      <!-- 空状态 -->
      <div v-if="filteredRecords.length === 0" class="text-center py-10 text-gray-400">
        <div class="text-4xl mb-3">📝</div>
        <div>暂无记录</div>
      </div>

      <!-- 记录列表 -->
      <div
        v-for="(record, index) in filteredRecords"
        :key="record.time + record.type"
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
          @click="deleteRecord(index)"
          class="ml-2 px-2 py-1 text-gray-300 hover:text-red-500 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>
