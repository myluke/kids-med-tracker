<script setup>
defineProps({
  title: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="flex justify-between items-center mb-4">
    <span class="font-semibold text-gray-800">{{ title }}</span>
    <button
      class="text-2xl text-gray-400 p-1"
      @click="emit('close')"
    >
      &times;
    </button>
  </div>
</template>
