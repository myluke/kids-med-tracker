<script setup>
import { watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  maxHeight: {
    type: Number,
    default: 85
  }
})

const emit = defineEmits(['close'])

watch(() => props.show, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.show) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="bottom-sheet">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center"
      >
        <!-- 遮罩层 -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="handleOverlayClick"
        />

        <!-- 弹层内容 -->
        <div
          class="sheet-content relative w-full bg-white rounded-t-3xl shadow-xl overflow-hidden"
          :style="{ maxHeight: `${maxHeight}vh` }"
        >
          <!-- 顶部拖拽指示条 -->
          <div class="flex justify-center pt-3 pb-2">
            <div class="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <!-- 内容插槽 -->
          <div
            class="overflow-y-auto px-5 pb-safe"
            :style="{ maxHeight: `calc(${maxHeight}vh - 24px)` }"
          >
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bottom-sheet-enter-active,
.bottom-sheet-leave-active {
  transition: opacity 0.3s ease;
}

.bottom-sheet-enter-from,
.bottom-sheet-leave-to {
  opacity: 0;
}

.bottom-sheet-enter-active .sheet-content,
.bottom-sheet-leave-active .sheet-content {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.bottom-sheet-enter-from .sheet-content,
.bottom-sheet-leave-to .sheet-content {
  transform: translateY(100%);
}

.pb-safe {
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
}
</style>
