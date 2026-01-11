<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <div
        v-if="error"
        class="text-rose-600"
      >
        <p class="text-lg font-medium">
          {{ t('views.authCallback.error') }}
        </p>
        <p class="mt-2 text-sm text-slate-600">
          {{ error }}
        </p>
        <router-link
          to="/login"
          class="mt-4 inline-block text-indigo-600 hover:underline"
        >
          {{ t('views.authCallback.backToLogin') }}
        </router-link>
      </div>
      <div v-else>
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p class="mt-4 text-slate-600">
          {{ t('views.authCallback.processing') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { useRecordsStore } from '@/stores/records'

const router = useRouter()
const { t } = useI18n()
const store = useRecordsStore()
const error = ref('')

let subscription = null
let timeoutId = null

onMounted(() => {
  // 监听认证状态变化（Supabase 会异步从 URL hash 解析 token）
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      clearTimeout(timeoutId)
      try {
        await store.bootstrap()
        router.replace('/')
      } catch (err) {
        console.error('Bootstrap error:', err)
        error.value = err.message || t('views.authCallback.unknownError')
      }
    }
  })
  subscription = data.subscription

  // 超时处理：10秒后如果还没登录成功，显示错误
  timeoutId = setTimeout(() => {
    if (!error.value && router.currentRoute.value.name === 'auth-callback') {
      error.value = t('views.authCallback.invalidToken')
    }
  }, 10000)
})

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe()
  }
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})
</script>
