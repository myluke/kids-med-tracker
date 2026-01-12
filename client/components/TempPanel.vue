<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordsStore } from '@/stores/records'

const store = useRecordsStore()
const emit = defineEmits(['close', 'submit'])
const { t } = useI18n()

const tempValue = ref('')

const quickTemps = [36.5, 37.0, 37.5, 38.0, 38.5, 39.0, 39.5, 40.0]

const currentChildColor = computed(() => {
  const child = store.children.find(c => c.id === store.currentChild)
  return child?.color || '#8B9DD9'
})

const setQuickTemp = (value) => {
  tempValue.value = value
}

const submit = () => {
  if (!tempValue.value) {
    alert(t('alerts.enterTemp'))
    return
  }
  emit('submit', parseFloat(tempValue.value))
  tempValue.value = ''
}
</script>

<template>
  <div class="panel">
    <div class="flex justify-between items-center mb-4">
      <span class="font-semibold text-gray-800">{{ t('panels.temp.title') }}</span>
      <button
        class="text-2xl text-gray-400 p-1"
        @click="emit('close')"
      >
        ×
      </button>
    </div>

    <!-- 快捷温度按钮 -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="tempOption in quickTemps"
        :key="tempOption"
        class="px-3.5 py-2 border border-gray-200 rounded-full text-sm bg-white 
               transition-all active:scale-95"
        :class="{ 
          'border-2': tempValue == tempOption 
        }"
        :style="tempValue == tempOption ? { 
          borderColor: currentChildColor,
          backgroundColor: store.children.find(c => c.id === store.currentChild)?.lightColor
        } : {}"
        @click="setQuickTemp(tempOption)"
      >
        {{ tempOption }}°
      </button>
    </div>

    <!-- 精确输入 -->
    <div class="mb-4">
      <label class="block text-xs text-gray-500 mb-1.5">{{ t('panels.temp.preciseLabel') }}</label>
      <input 
        v-model="tempValue"
        type="number" 
        placeholder="38.5"
        step="0.1"
        min="35"
        max="42"
        class="input-field"
      >
    </div>

    <!-- 提交按钮 -->
    <button 
      class="w-full py-4 rounded-xl text-white font-semibold transition-transform active:scale-98"
      :style="{ backgroundColor: currentChildColor }"
      @click="submit"
    >
      {{ t('panels.submit') }}
    </button>
  </div>
</template>
