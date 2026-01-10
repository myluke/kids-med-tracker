<script setup>
import { ref, inject, computed } from 'vue'
import { useRecordsStore, medications, children } from '@/stores/records'

const store = useRecordsStore()
const emit = defineEmits(['close', 'submit'])

const selectedMed = ref(null)
const dosage = ref('')
const temp = ref('')

const currentChildColor = computed(() => {
  const child = children.find(c => c.id === store.currentChild)
  return child?.color || '#4A90D9'
})

const selectMed = (med) => {
  selectedMed.value = med.name
}

const submit = () => {
  if (!selectedMed.value) {
    alert('请选择药物')
    return
  }
  
  emit('submit', {
    drug: selectedMed.value,
    dosage: dosage.value || '未填写',
    temp: temp.value ? parseFloat(temp.value) : null
  })
  
  // 重置
  selectedMed.value = null
  dosage.value = ''
  temp.value = ''
}
</script>

<template>
  <div class="panel">
    <div class="flex justify-between items-center mb-4">
      <span class="font-semibold text-gray-800">💊 记录用药</span>
      <button @click="emit('close')" class="text-2xl text-gray-400 p-1">×</button>
    </div>

    <!-- 药物选择 -->
    <div class="grid grid-cols-2 gap-2.5 mb-4">
      <button
        v-for="med in medications"
        :key="med.name"
        @click="selectMed(med)"
        class="p-3.5 border-2 rounded-xl text-center transition-all active:scale-95"
        :class="selectedMed === med.name 
          ? 'border-current' 
          : 'border-gray-200 bg-white'"
        :style="selectedMed === med.name ? { 
          borderColor: currentChildColor,
          backgroundColor: children.find(c => c.id === store.currentChild)?.lightColor
        } : {}"
      >
        <div class="text-2xl mb-1">{{ med.icon }}</div>
        <div class="text-sm font-medium">{{ med.name }}</div>
      </button>
    </div>

    <!-- 输入框 -->
    <div class="flex gap-2.5 mb-4">
      <div class="flex-1">
        <label class="block text-xs text-gray-500 mb-1.5">剂量</label>
        <input 
          v-model="dosage"
          type="text" 
          placeholder="如：5ml / 1片"
          class="input-field"
        >
      </div>
      <div class="flex-1">
        <label class="block text-xs text-gray-500 mb-1.5">当前体温（可选）</label>
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
      @click="submit"
      class="w-full py-4 rounded-xl text-white font-semibold transition-transform active:scale-98"
      :style="{ backgroundColor: currentChildColor }"
    >
      ✓ 确认记录
    </button>
  </div>
</template>
