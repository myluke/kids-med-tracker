<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'submit'])

const note = ref('')

const coughLevels = [
  { level: '轻微', icon: '😊', color: 'green' },
  { level: '中度', icon: '😐', color: 'yellow' },
  { level: '剧烈', icon: '😣', color: 'red' }
]

const submit = (level) => {
  emit('submit', {
    level,
    note: note.value
  })
  note.value = ''
}
</script>

<template>
  <div class="panel">
    <div class="flex justify-between items-center mb-4">
      <span class="font-semibold text-gray-800">🫁 记录咳嗽</span>
      <button @click="emit('close')" class="text-2xl text-gray-400 p-1">×</button>
    </div>

    <!-- 咳嗽程度选择 -->
    <div class="flex gap-2.5 mb-4">
      <button
        v-for="item in coughLevels"
        :key="item.level"
        @click="submit(item.level)"
        class="flex-1 py-5 border-2 rounded-xl text-center transition-all active:scale-95"
        :class="{
          'border-gray-200 bg-white': true,
          'active:border-green-400 active:bg-green-50': item.color === 'green',
          'active:border-yellow-400 active:bg-yellow-50': item.color === 'yellow',
          'active:border-red-400 active:bg-red-50': item.color === 'red'
        }"
      >
        <div class="text-3xl mb-2">{{ item.icon }}</div>
        <div class="text-sm font-medium">{{ item.level }}</div>
      </button>
    </div>

    <!-- 备注 -->
    <div>
      <label class="block text-xs text-gray-500 mb-1.5">备注（可选）</label>
      <input 
        v-model="note"
        type="text" 
        placeholder="如：睡前咳嗽加重"
        class="input-field"
      >
    </div>
  </div>
</template>
