<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const containerRef = ref(null)
const widgetId = ref(null)
const isScriptLoaded = ref(false)
const isRendered = ref(false)
const manualToken = ref('')
const showManualInput = ref(false)

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

const hasSiteKey = computed(() => !!siteKey)

// 加载 Turnstile 脚本
function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }

    const existingScript = document.querySelector('script[src*="turnstile"]')
    if (existingScript) {
      existingScript.addEventListener('load', resolve)
      existingScript.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// 渲染 Turnstile widget
function renderWidget() {
  if (!window.turnstile || !containerRef.value || isRendered.value || !siteKey) {
    return
  }

  try {
    widgetId.value = window.turnstile.render(containerRef.value, {
      sitekey: siteKey,
      theme: 'light',
      callback: (token) => {
        showManualInput.value = false
        emit('update:modelValue', token)
      },
      'expired-callback': () => {
        emit('update:modelValue', '')
      },
      'error-callback': () => {
        showManualInput.value = true
      },
    })
    isRendered.value = true
  } catch (error) {
    console.error('Turnstile render error:', error)
    showManualInput.value = true
  }
}

// 重置 widget
function reset() {
  if (window.turnstile && widgetId.value !== null) {
    window.turnstile.reset(widgetId.value)
    emit('update:modelValue', '')
  }
}

// 手动 token 输入
function onManualInput() {
  emit('update:modelValue', manualToken.value)
}

onMounted(async () => {
  if (!siteKey) {
    showManualInput.value = true
    return
  }

  try {
    await loadScript()
    isScriptLoaded.value = true
    // 等待 DOM 更新后渲染
    setTimeout(renderWidget, 100)
  } catch (error) {
    console.error('Failed to load Turnstile script:', error)
    showManualInput.value = true
  }
})

onUnmounted(() => {
  if (window.turnstile && widgetId.value !== null) {
    window.turnstile.remove(widgetId.value)
  }
})

// 监听 disabled 状态变化
watch(() => props.disabled, (disabled) => {
  if (!disabled && isScriptLoaded.value && !isRendered.value) {
    renderWidget()
  }
})

defineExpose({ reset })
</script>

<template>
  <div class="turnstile-wrapper">
    <!-- 没有配置 siteKey -->
    <div
      v-if="!hasSiteKey"
      class="turnstile-error"
    >
      <span class="text-sm text-amber-600">{{ t('turnstile.missingSiteKey') }}</span>
    </div>

    <!-- Turnstile 容器 -->
    <div
      v-show="hasSiteKey && !showManualInput"
      ref="containerRef"
      class="turnstile-container"
    />

    <!-- 手动输入 token（备用方案） -->
    <div
      v-if="showManualInput"
      class="turnstile-manual"
    >
      <div class="text-sm text-gray-500 mb-2">
        {{ t('turnstile.unavailable') }}
      </div>
      <input
        v-model="manualToken"
        type="text"
        class="turnstile-input"
        :placeholder="t('turnstile.manualTokenPlaceholder')"
        :disabled="disabled"
        @input="onManualInput"
      >
    </div>

    <!-- 提示文字 -->
    <div
      v-if="hasSiteKey && !showManualInput && !modelValue"
      class="turnstile-hint"
    >
      {{ t('turnstile.hint') }}
    </div>
  </div>
</template>

<style scoped>
.turnstile-wrapper {
  @apply flex flex-col items-center gap-2;
}

.turnstile-container {
  min-height: 65px;
}

.turnstile-error {
  @apply p-3 rounded-xl bg-amber-50 ring-1 ring-amber-200;
}

.turnstile-manual {
  @apply w-full;
}

.turnstile-input {
  @apply w-full px-4 py-3 rounded-xl text-sm text-gray-800 transition-all duration-200;
  background: rgba(248, 250, 252, 0.8);
  border: 2px solid transparent;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.turnstile-input:focus {
  @apply outline-none;
  background: white;
  border-color: #8B9DD9;
  box-shadow: 0 0 0 3px rgba(139, 157, 217, 0.15);
}

.turnstile-input:disabled {
  @apply opacity-60 cursor-not-allowed;
}

.turnstile-hint {
  @apply text-xs text-gray-400;
}
</style>
