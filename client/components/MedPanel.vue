<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useChildrenStore, medications } from '@/stores'
import PanelHeader from './PanelHeader.vue'

const childrenStore = useChildrenStore()
const { currentChildColor, currentChildLightColor } = storeToRefs(childrenStore)
const emit = defineEmits(['close', 'submit'])
const { t } = useI18n()

const selectedMed = ref(null)
const dosage = ref('')
const temp = ref('')

const selectMed = (med) => {
  selectedMed.value = med.name
}

const submit = () => {
  if (!selectedMed.value) {
    alert(t('alerts.selectDrug'))
    return
  }
  
  emit('submit', {
    drug: selectedMed.value,
    dosage: dosage.value || t('common.notFilled'),
    temp: temp.value ? parseFloat(temp.value) : null
  })
  
  // 重置
  selectedMed.value = null
  dosage.value = ''
  temp.value = ''
}
</script>

<template>
  <div>
    <PanelHeader
      :title="t('panels.med.title')"
      @close="emit('close')"
    />

    <!-- 药物选择 -->
    <div class="grid grid-cols-2 gap-2.5 mb-4">
      <button
        v-for="med in medications"
        :key="med.name"
        class="p-3.5 border-2 rounded-xl text-center transition-all active:scale-95"
        :class="selectedMed === med.name 
          ? 'border-current' 
          : 'border-gray-200 bg-white'"
        :style="selectedMed === med.name ? {
          borderColor: currentChildColor,
          backgroundColor: currentChildLightColor
        } : {}"
        @click="selectMed(med)"
      >
        <div class="text-2xl mb-1">
          {{ med.icon }}
        </div>
        <div class="text-sm font-medium">
          {{ med.name }}
        </div>
      </button>
    </div>

    <!-- 输入框 -->
    <div class="flex gap-2.5 mb-4">
      <div class="flex-1">
        <label class="block text-xs text-gray-500 mb-1.5">{{ t('panels.med.doseLabel') }}</label>
        <input 
          v-model="dosage"
          type="text" 
          :placeholder="t('panels.med.dosePlaceholder')"
          class="input-field"
        >
      </div>
      <div class="flex-1">
        <label class="block text-xs text-gray-500 mb-1.5">{{ t('panels.med.tempLabel') }}</label>
        <input 
          v-model="temp"
          type="number" 
          placeholder="38.5"
          step="0.1"
          min="35"
          max="42"
          class="input-field"
        >
      </div>
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
