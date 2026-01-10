<script setup>
import { computed } from 'vue'
import { useRecordsStore, children } from '@/stores/records'

const store = useRecordsStore()

const emit = defineEmits(['open-med', 'open-cough', 'open-temp', 'quick-note'])

const currentChildColor = computed(() => {
  const child = children.find(c => c.id === store.currentChild)
  return child?.color || '#4A90D9'
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <button 
      @click="emit('open-med')"
      class="btn-primary flex flex-col items-center py-5"
      :style="{ 
        background: `linear-gradient(135deg, ${currentChildColor} 0%, ${currentChildColor}dd 100%)`
      }"
    >
      <span class="text-3xl mb-2">💊</span>
      <span>记录用药</span>
    </button>
    
    <button 
      @click="emit('open-cough')"
      class="btn-secondary flex flex-col items-center py-5"
    >
      <span class="text-3xl mb-2">🫁</span>
      <span>记录咳嗽</span>
    </button>
    
    <button 
      @click="emit('open-temp')"
      class="btn-secondary flex flex-col items-center py-5"
    >
      <span class="text-3xl mb-2">🌡️</span>
      <span>记录体温</span>
    </button>
    
    <button 
      @click="emit('quick-note')"
      class="btn-secondary flex flex-col items-center py-5"
    >
      <span class="text-3xl mb-2">📝</span>
      <span>快速备注</span>
    </button>
  </div>
</template>
