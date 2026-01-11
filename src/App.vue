<script setup>
import { ref, computed, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRecordsStore } from './stores/records'

const router = useRouter()
const route = useRoute()
const store = useRecordsStore()
const { t, locale } = useI18n()

// Toast状态
const toastMessage = ref('')
const showToast = ref(false)

// 显示Toast
const toast = (message) => {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

// 提供给子组件使用
provide('toast', toast)

// 当前时间
const currentTime = ref('')
const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString(locale.value, {
    hour: '2-digit',
    minute: '2-digit'
  })
}
updateTime()
setInterval(updateTime, 1000)

// 导出数据
const exportData = () => {
  const data = store.exportRecords({
    locale: locale.value,
    t
  })
  const blob = new Blob([data], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const date = new Date().toLocaleDateString(locale.value).replace(/\//g, '-')
  a.download = `${t('export.filePrefix')}_${date}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast(t('toast.exported'))
}

// 当前主题色（根据选中的孩子）
const themeClass = computed(() => {
  return store.currentChild === 'child2' ? 'theme-erbao' : 'theme-dabo'
})
</script>

<template>
  <div
    :class="themeClass"
    class="min-h-screen"
  >
    <!-- Header -->
    <header class="bg-gradient-to-br from-warm-100 to-warm-200 px-5 pt-5 pb-8 rounded-b-3xl relative">
      <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
        <img
          src="/logo.svg"
          alt="App Logo"
          class="w-10 h-10 drop-shadow-sm"
        >
        <span>{{ t('app.title') }}</span>
      </h1>
      <p class="text-gray-500 text-sm mt-1">
        {{ t('app.subtitle') }}
      </p>
      <div class="absolute right-5 top-5 text-sm text-gray-500 bg-white/70 px-3 py-1.5 rounded-full">
        {{ currentTime }}
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 -mt-4">
      <router-view v-slot="{ Component }">
        <transition
          name="fade"
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white flex justify-around py-3 pb-6 shadow-card-lg rounded-t-2xl z-50">
      <button 
        class="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
        :class="route.path === '/' ? 'text-dabo' : 'text-gray-400'"
        @click="router.push('/')"
      >
        <span class="text-2xl">🏠</span>
        <span class="text-xs font-medium">{{ t('nav.home') }}</span>
      </button>
      <button 
        class="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
        :class="route.path === '/stats' ? 'text-dabo' : 'text-gray-400'"
        @click="router.push('/stats')"
      >
        <span class="text-2xl">📊</span>
        <span class="text-xs font-medium">{{ t('nav.stats') }}</span>
      </button>
      <button 
        class="flex flex-col items-center gap-1 px-4 py-2 text-gray-400 transition-colors hover:text-dabo"
        @click="exportData"
      >
        <span class="text-2xl">📤</span>
        <span class="text-xs font-medium">{{ t('nav.export') }}</span>
      </button>
    </nav>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div 
          v-if="showToast"
          class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                 bg-gray-800/90 text-white px-8 py-4 rounded-xl text-base font-medium z-[1000]"
        >
          {{ toastMessage }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 二宝主题 */
.theme-erbao :deep(.text-dabo) {
  @apply text-erbao;
}
.theme-erbao :deep(.bg-dabo) {
  @apply bg-erbao;
}
.theme-erbao :deep(.border-dabo) {
  @apply border-erbao;
}
.theme-erbao :deep(.from-dabo) {
  --tw-gradient-from: #E85D75;
}
.theme-erbao :deep(.to-dabo-dark) {
  --tw-gradient-to: #DC2626;
}
</style>
