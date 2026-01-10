<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRecordsStore } from '@/stores/records'

const store = useRecordsStore()

// 每分钟更新一次
const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 计算显示内容
const timerData = computed(() => {
  const lastMed = store.lastFeverMed
  
  if (!lastMed) {
    return {
      display: '--:--',
      label: '暂无退烧药记录',
      status: 'safe',
      statusText: '可以用药',
      canTake: true
    }
  }

  const lastTime = new Date(lastMed.time).getTime()
  const diffMs = now.value - lastTime
  const diffHours = diffMs / (1000 * 60 * 60)
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const display = `${hours}:${minutes.toString().padStart(2, '0')}`

  if (diffHours >= 6) {
    return {
      display,
      label: `距上次服用 ${lastMed.drug}`,
      status: 'safe',
      statusText: '可以用药',
      canTake: true
    }
  } else if (diffHours >= 4) {
    return {
      display,
      label: `距上次服用 ${lastMed.drug}`,
      status: 'warning',
      statusText: '可酌情用药',
      canTake: true
    }
  } else {
    const waitHours = Math.floor(4 - diffHours)
    const waitMins = Math.ceil((4 - diffHours - waitHours) * 60)
    return {
      display,
      label: `还需等待约 ${waitHours}小时${waitMins}分钟`,
      status: 'danger',
      statusText: '请等待',
      canTake: false
    }
  }
})

const statusClasses = computed(() => {
  const status = timerData.value.status
  return {
    badge: {
      safe: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800'
    }[status],
    time: {
      safe: 'text-green-500',
      warning: 'text-yellow-500',
      danger: 'text-yellow-500'
    }[status]
  }
})
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <span class="text-gray-500 font-semibold flex items-center gap-2">
        💊 退烧药状态
      </span>
      <span 
        class="px-3 py-1 rounded-full text-xs font-medium"
        :class="statusClasses.badge"
      >
        {{ timerData.statusText }}
      </span>
    </div>
    
    <div class="text-center py-5">
      <div 
        class="text-5xl font-bold tracking-tight"
        :class="statusClasses.time"
      >
        {{ timerData.display }}
      </div>
      <div class="text-sm text-gray-500 mt-2">
        {{ timerData.label }}
      </div>
    </div>
  </div>
</template>
