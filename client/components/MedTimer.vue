<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordsStore, medications } from '@/stores'

const recordsStore = useRecordsStore()
const { t } = useI18n()

// 从配置中获取退烧药间隔阈值
const feverMedIntervals = medications.filter(m => m.isFeverMed).map(m => m.interval)
const MIN_INTERVAL = Math.min(...feverMedIntervals) // 最短间隔 (4h)
const MAX_INTERVAL = Math.max(...feverMedIntervals) // 最长间隔 (6h)

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
  const lastMed = recordsStore.lastFeverMed
  
  if (!lastMed) {
    return {
      display: '--:--',
      label: t('timer.noRecord'),
      status: 'safe',
      statusText: t('timer.canTake'),
      canTake: true
    }
  }

  const lastTime = new Date(lastMed.time).getTime()
  const diffMs = now.value - lastTime
  const diffHours = diffMs / (1000 * 60 * 60)
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const display = `${hours}:${minutes.toString().padStart(2, '0')}`

  if (diffHours >= MAX_INTERVAL) {
    return {
      display,
      label: t('timer.sinceLast', { drug: lastMed.drug }),
      status: 'safe',
      statusText: t('timer.canTake'),
      canTake: true
    }
  } else if (diffHours >= MIN_INTERVAL) {
    return {
      display,
      label: t('timer.sinceLast', { drug: lastMed.drug }),
      status: 'warning',
      statusText: t('timer.optional'),
      canTake: true
    }
  } else {
    const waitHours = Math.floor(MIN_INTERVAL - diffHours)
    const waitMins = Math.ceil((MIN_INTERVAL - diffHours - waitHours) * 60)
    return {
      display,
      label: t('timer.needWait', { hours: waitHours, mins: waitMins }),
      status: 'danger',
      statusText: t('timer.wait'),
      canTake: false
    }
  }
})

const statusClasses = computed(() => {
  const status = timerData.value.status
  return {
    badge: {
      safe: 'bg-mint-light text-mint-dark',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-erbao-light text-erbao-dark'
    }[status],
    time: {
      safe: 'text-mint',
      warning: 'text-yellow-500',
      danger: 'text-erbao'
    }[status]
  }
})
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <span class="text-gray-500 font-semibold flex items-center gap-2">
        {{ t('timer.title') }}
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
