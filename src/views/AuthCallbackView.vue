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
const handled = ref(false)

let subscription = null
let timeoutId = null

async function handleSignIn(session) {
  if (handled.value) return
  handled.value = true
  clearTimeout(timeoutId)

  if (!session) {
    error.value = t('views.authCallback.invalidToken')
    return
  }

  try {
    await store.bootstrap()
    router.replace('/')
  } catch (err) {
    console.error('Bootstrap error:', err)
    error.value = err.message || t('views.authCallback.unknownError')
  }
}

onMounted(async () => {
  // Supabase 的 detectSessionInUrl: true 会自动处理 URL 中的 code/token
  // 我们只需监听认证状态变化
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state change:', event, !!session)
    if (event === 'SIGNED_IN' && session) {
      await handleSignIn(session)
    } else if (event === 'INITIAL_SESSION') {
      // 初始 session 检查 - 如果已有 session 则处理
      if (session) {
        await handleSignIn(session)
      }
    }
  })
  subscription = data.subscription

  // 超时处理：如果 10 秒内没有收到认证事件，显示错误
  timeoutId = setTimeout(() => {
    if (!handled.value && !error.value) {
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
