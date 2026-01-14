<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits(['open-med', 'open-cough', 'open-temp', 'quick-note'])
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <button
      class="btn-secondary flex flex-col items-center py-5"
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
