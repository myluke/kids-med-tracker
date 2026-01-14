<script setup>
import { ref, computed, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { pullRefreshState } from '@/stores'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  threshold: {
    type: Number,
    default: 60
  }
})

const emit = defineEmits(['refresh'])

const { t } = useI18n()

// 状态: idle | pulling | ready | refreshing
const state = ref('idle')
const pullDistance = ref(0)
const startY = ref(0)
const containerRef = ref(null)
const isTouchValid = ref(false)  // 标记当前触摸是否从顶部开始
const hasHitTopBoundary = ref(false)  // 是否已触碰顶部边界

// 阻尼系数：越拉越慢
const dampingFactor = 0.4

// 计算实际显示的下拉距离（带阻尼）
const displayDistance = computed(() => {
  return Math.min(pullDistance.value * dampingFactor, props.threshold * 1.5)
})

// 判断是否在顶部
const isAtTop = () => {
  if (!containerRef.value) return true
  const scrollTop = containerRef.value.scrollTop
  return scrollTop <= 0
}

const onTouchStart = (e) => {
  if (props.disabled || state.value === 'refreshing') return

  // 只有在顶部开始的触摸才有效
  isTouchValid.value = isAtTop()
  if (!isTouchValid.value) return

  startY.value = e.touches[0].clientY
  state.value = 'idle'
}

const onTouchMove = (e) => {
  if (props.disabled || state.value === 'refreshing') return

  // 如果触摸不是从顶部开始的，忽略
  if (!isTouchValid.value) return

  // 如果中途滚动离开了顶部，取消下拉状态
  if (!isAtTop()) {
    pullDistance.value = 0
    state.value = 'idle'
    hasHitTopBoundary.value = false
    return
  }

  const currentY = e.touches[0].clientY
  const diff = currentY - startY.value

  // 在顶部尝试上滑 = 触碰顶部边界
  if (diff < 0) {
    hasHitTopBoundary.value = true
  }

  // 只有触碰过边界后才能触发下拉刷新
  if (diff > 0 && hasHitTopBoundary.value) {
    e.preventDefault()
    pullDistance.value = diff

    if (displayDistance.value >= props.threshold) {
      state.value = 'ready'
    } else {
      state.value = 'pulling'
    }
  }
}

const onTouchEnd = () => {
  // 重置触摸状态
  isTouchValid.value = false
  hasHitTopBoundary.value = false

  if (props.disabled || state.value === 'refreshing') return

  if (state.value === 'ready') {
    state.value = 'refreshing'
    pullDistance.value = props.threshold / dampingFactor

    emit('refresh', () => {
      state.value = 'idle'
      pullDistance.value = 0
    })
  } else {
    state.value = 'idle'
    pullDistance.value = 0
  }
}

// 图标旋转角度
const iconRotation = computed(() => {
  if (state.value === 'ready') return 180
  const progress = Math.min(displayDistance.value / props.threshold, 1)
  return progress * 180
})

// 同步状态到全局
watchEffect(() => {
  pullRefreshState.displayDistance = displayDistance.value
  pullRefreshState.state = state.value
})
</script>

<template>
  <div
    ref="containerRef"
    class="pull-to-refresh-container"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- 刷新指示器 - 传送到 body 避免受 transform 影响 -->
    <Teleport to="body">
      <div
        class="refresh-indicator"
        :style="{ height: `${displayDistance}px` }"
      >
        <div
          v-if="state !== 'idle' || displayDistance > 0"
          class="refresh-content"
        >
          <!-- 刷新中 -->
          <template v-if="state === 'refreshing'">
            <svg
              class="refresh-icon spinning"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <span class="refresh-text">{{ t('pullToRefresh.refreshing') }}</span>
          </template>

          <!-- 下拉中 / 可释放 -->
          <template v-else>
            <svg
              class="refresh-icon"
              :style="{ transform: `rotate(${iconRotation}deg)` }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            <span class="refresh-text">
              {{ state === 'ready' ? t('pullToRefresh.release') : t('pullToRefresh.pull') }}
            </span>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- 内容区域 -->
    <div class="refresh-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pull-to-refresh-container {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  touch-action: pan-x pan-down;
}

.refresh-indicator {
  position: fixed;
  top: 108px; /* Header 高度: pt-5(20px) + 内容(~48px) + pb-8(32px) + 圆角(~8px) */
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

.refresh-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  color: var(--color-primary, #3b82f6);
}

.refresh-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.2s ease;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.refresh-text {
  font-size: 14px;
}

.refresh-body {
  min-height: 100%;
}

/* 主题色支持 */
.theme-erbao .refresh-content {
  color: var(--color-erbao, #ec4899);
}
</style>
