<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['close', 'submit'])

const note = ref('')
const { t } = useI18n()

const coughLevels = [
  { level: '轻微', icon: '😊', color: 'mint' },
  { level: '中度', icon: '😐', color: 'yellow' },
  { level: '剧烈', icon: '😣', color: 'erbao' }
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
  <div>
    <div class="flex justify-between items-center mb-4">
      <span class="font-semibold text-gray-800">{{ t('panels.cough.title') }}</span>
      <button
        class="text-2xl text-gray-400 p-1"
        @click="emit('close')"
      >
        ×
      </button>
    </div>

    <!-- 咳嗽程度选择 -->
    <div class="flex gap-2.5 mb-4">
      <button
        v-for="item in coughLevels"
        :key="item.level"
        class="flex-1 py-5 border-2 rounded-xl text-center transition-all active:scale-95"
        :class="{
          'border-gray-200 bg-white': true,
          'active:border-mint active:bg-mint-light': item.color === 'mint',
          'active:border-yellow-400 active:bg-yellow-50': item.color === 'yellow',
          'active:border-erbao active:bg-erbao-light': item.color === 'erbao'
        }"
        @click="submit(item.level)"
      >
        <div class="text-3xl mb-2">
          {{ item.icon }}
        </div>
        <div class="text-sm font-medium">
          {{ item.level }}
        </div>
      </button>
    </div>

    <!-- 备注 -->
    <div>
      <label class="block text-xs text-gray-500 mb-1.5">{{ t('panels.cough.noteLabel') }}</label>
      <input 
        v-model="note"
        type="text" 
        :placeholder="t('panels.cough.notePlaceholder')"
        class="input-field"
      >
    </div>
  </div>
</template>
