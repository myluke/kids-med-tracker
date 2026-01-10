<script setup>
import { useRecordsStore, children } from '@/stores/records'

const store = useRecordsStore()
</script>

<template>
  <div class="flex gap-3">
    <button
      v-for="child in children"
      :key="child.id"
      @click="store.switchChild(child.id)"
      class="flex-1 p-4 rounded-xl border-3 transition-all text-center relative overflow-hidden"
      :class="[
        store.currentChild === child.id 
          ? 'border-current shadow-lg' 
          : 'border-transparent',
        child.id === 'child1' ? 'bg-dabo-light' : 'bg-erbao-light'
      ]"
      :style="store.currentChild === child.id ? { 
        borderColor: child.color,
        boxShadow: `0 4px 15px ${child.color}40`
      } : {}"
    >
      <div 
        class="w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto mb-2"
        :style="{ backgroundColor: child.color }"
      >
        {{ child.emoji }}
      </div>
      <div class="font-semibold text-gray-800">{{ child.name }}</div>
      <div class="text-xs text-gray-500">{{ child.age }} · {{ child.gender === 'boy' ? '男孩' : '女孩' }}</div>
    </button>
  </div>
</template>

<style scoped>
.border-3 {
  border-width: 3px;
}
</style>
