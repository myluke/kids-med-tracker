<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useChildrenStore } from '@/stores'

const childrenStore = useChildrenStore()
const { currentChildColor } = storeToRefs(childrenStore)
const emit = defineEmits(['close', 'submit'])
const { t } = useI18n()

const note = ref('')

const submit = () => {
  if (!note.value.trim()) {
    return
  }
  emit('submit', note.value.trim())
  note.value = ''
}

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <span class="font-semibold text-gray-800">{{ t('panels.note.title') }}</span>
      <button
        class="text-2xl text-gray-400 p-1"
        @click="emit('close')"
      >
        &times;
      </button>
    </div>

    <!-- 备注输入 -->
    <div class="mb-4">
      <textarea
        v-model="note"
        rows="3"
        :placeholder="t('panels.note.placeholder')"
        class="input-field resize-none"
        autofocus
        @keydown="handleKeydown"
      />
    </div>

    <!-- 提交按钮 -->
    <button
      class="w-full py-4 rounded-xl text-white font-semibold transition-transform active:scale-98 disabled:opacity-50"
      :style="{ backgroundColor: currentChildColor }"
      :disabled="!note.trim()"
      @click="submit"
    >
      {{ t('panels.submit') }}
    </button>
  </div>
</template>
