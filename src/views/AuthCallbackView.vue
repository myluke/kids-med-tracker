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
  // 1. 先检查 URL 中是否有 code 参数（PKCE 流程）
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')

  if (code) {
    // 使用 code 交换 session
    const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    if (authError) {
      console.error('Exchange code error:', authError)
      error.value = t('views.authCallback.invalidToken')
      return
    }
    await handleSignIn(data.session)
    return
  }

  // 2. 检查 URL hash 中是否有 token（传统流程）
  // Supabase 会自动处理，我们监听状态变化
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state change:', event, !!session)
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      await handleSignIn(session)
    }
  })
  subscription = data.subscription

  // 3. 也检查是否已经有 session（可能在监听器注册前就处理完了）
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session) {
    await handleSignIn(sessionData.session)
  }

  // 超时处理
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
