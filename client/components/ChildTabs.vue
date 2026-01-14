<script setup>
import { useI18n } from 'vue-i18n'
import { useChildrenStore, switchChild } from '@/stores'

const childrenStore = useChildrenStore()
const { t } = useI18n()
</script>

<template>
  <div class="flex gap-3">
    <button
      v-for="child in childrenStore.children"
      :key="child.id"
      class="flex-1 p-4 rounded-xl border-3 transition-all text-center relative overflow-hidden"
      :class="childrenStore.currentChild === child.id
        ? 'border-current shadow-lg'
        : 'border-transparent'"
      :style="{
        backgroundColor: child.lightColor,
        ...(childrenStore.currentChild === child.id ? {
          borderColor: child.color,
          boxShadow: `0 4px 15px ${child.color}40`
        } : {})
      }"
      @click="switchChild(child.id)"
    >
      <div 
        class="w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto mb-2"
        :style="{ backgroundColor: child.color }"
      >
        {{ child.emoji }}
      </div>
      <div class="font-semibold text-gray-800">
        {{ child.name }}
      </div>
      <div class="text-xs text-gray-500">
        {{ child.age }} · {{ child.gender === 'boy' ? t('child.boy') : t('child.girl') }}
      </div>
    </button>
  </div>
</template>

<style scoped>
.border-3 {
  border-width: 3px;
}
</style>
