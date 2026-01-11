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
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { useRecordsStore } from '@/stores/records'

const router = useRouter()
const { t } = useI18n()
const store = useRecordsStore()
const error = ref('')

onMounted(async () => {
  try {
    // Supabase 会自动从 URL hash 中解析 tokens
    const { data, error: authError } = await supabase.auth.getSession()

    if (authError) {
      throw authError
    }

    if (data.session) {
      await store.bootstrap()
      router.replace('/')
    } else {
      // 没有 session，可能是 token 无效或已过期
      error.value = t('views.authCallback.invalidToken')
    }
  } catch (err) {
    console.error('Auth callback error:', err)
    error.value = err.message || t('views.authCallback.unknownError')
  }
})
</script>
