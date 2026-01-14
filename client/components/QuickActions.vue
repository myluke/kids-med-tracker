<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits(['open-med', 'open-cough', 'open-temp', 'quick-note'])

const actions = [
  { icon: '💊', labelKey: 'quickActions.med', event: 'open-med' },
  { icon: '🫁', labelKey: 'quickActions.cough', event: 'open-cough' },
  { icon: '🌡️', labelKey: 'quickActions.temp', event: 'open-temp' },
  { icon: '📝', labelKey: 'quickActions.note', event: 'quick-note' }
]
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <button
      v-for="action in actions"
      :key="action.event"
      class="btn-secondary flex flex-col items-center py-5"
      @click="emit(action.event)"
    >
      <span class="text-3xl mb-2">{{ action.icon }}</span>
      <span>{{ t(action.labelKey) }}</span>
    </button>
  </div>
</template>
