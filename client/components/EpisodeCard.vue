<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  episode: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click'])

const { t, d } = useI18n()

const isActive = computed(() => props.episode.status === 'active')

const dateRange = computed(() => {
  const start = d(new Date(props.episode.startedAt), 'short')
  if (isActive.value || !props.episode.endedAt) {
    return t('episode.dateRangeOngoing', { start })
  }
  const end = d(new Date(props.episode.endedAt), 'short')
  return t('episode.dateRange', { start, end })
})

const summary = computed(() => {
  return props.episode.summaryJson || {
    durationDays: 0,
    medCount: 0,
    maxTemp: null
  }
})
</script>

<template>
  <div
    class="card cursor-pointer hover:shadow-md transition-shadow"
    @click="emit('click', episode)"
  >
    <div class="flex items-start gap-3">
      <!-- Timeline dot -->
      <div
        class="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
        :class="isActive ? 'bg-mint animate-pulse' : 'bg-gray-300'"
      />

      <div class="flex-1 min-w-0">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-semibold text-gray-800">
              {{ dateRange }}
            </span>
            <span
              v-if="isActive"
              class="ml-2 text-xs px-2 py-0.5 rounded-full bg-mint-light text-mint-dark"
            >
              {{ t('episode.current') }}
            </span>
          </div>
          <span class="text-sm text-gray-500">
            {{ summary.durationDays }}{{ t('episode.days') }}
          </span>
        </div>

        <div class="mt-2 flex gap-4 text-sm text-gray-600">
          <span class="flex items-center gap-1">
            <span>💊</span>
            {{ t('episode.medCountShort', { count: summary.medCount }) }}
          </span>
          <span v-if="summary.maxTemp" class="flex items-center gap-1">
            <span>🌡️</span>
            {{ t('episode.maxTempShort', { temp: summary.maxTemp }) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
