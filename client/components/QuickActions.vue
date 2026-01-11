<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordsStore } from '@/stores/records'

const store = useRecordsStore()
const { t } = useI18n()

const emit = defineEmits(['open-med', 'open-cough', 'open-temp', 'quick-note'])

const currentChildColor = computed(() => {
  const child = store.children.find(c => c.id === store.currentChild)
  return child?.color || '#4A90D9'
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <button 
      class="btn-primary flex flex-col items-center py-5"
      :style="{ 
        background: `linear-gradient(135deg, ${currentChildColor} 0%, ${currentChildColor}dd 100%)`
      }"
      @click="emit('open-med')"
    >
      <span class="text-3xl mb-2">💊</span>
      <span>{{ t('quickActions.med') }}</span>
    </button>
    
    <button 
      class="btn-secondary flex flex-col items-center py-5"
      @click="emit('open-cough')"
    >
      <span class="text-3xl mb-2">🫁</span>
      <span>{{ t('quickActions.cough') }}</span>
    </button>
    
    <button 
      class="btn-secondary flex flex-col items-center py-5"
      @click="emit('open-temp')"
    >
      <span class="text-3xl mb-2">🌡️</span>
      <span>{{ t('quickActions.temp') }}</span>
    </button>
    
    <button 
      class="btn-secondary flex flex-col items-center py-5"
      @click="emit('quick-note')"
    >
      <span class="text-3xl mb-2">📝</span>
      <span>{{ t('quickActions.note') }}</span>
    </button>
  </div>
</template>
