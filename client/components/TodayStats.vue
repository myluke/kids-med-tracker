<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordsStore } from '@/stores/records'

const store = useRecordsStore()
const { t } = useI18n()

const stats = computed(() => store.todayStats)
</script>

<template>
  <div class="grid grid-cols-3 gap-2.5">
    <div class="card text-center py-4">
      <div class="text-3xl font-bold text-gray-800 mb-1">
        {{ stats.medCount }}
      </div>
      <div class="text-xs text-gray-500">
        {{ t('todayStats.med') }}
      </div>
    </div>
    
    <div class="card text-center py-4">
      <div class="text-3xl font-bold text-gray-800 mb-1">
        {{ stats.coughCount }}
      </div>
      <div class="text-xs text-gray-500">
        {{ t('todayStats.cough') }}
      </div>
    </div>
    
    <div class="card text-center py-4">
      <div class="text-3xl font-bold text-gray-800 mb-1">
        {{ stats.lastTemp ? stats.lastTemp + '°' : '--' }}
      </div>
      <div class="text-xs text-gray-500">
        {{ t('todayStats.temp') }}
      </div>
    </div>
  </div>
</template>
