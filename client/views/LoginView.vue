<template>
  <div class="mx-auto w-full max-w-md px-4 pt-6 pb-24">
    <!-- Logo 和标题 -->
    <div class="mb-6 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
        <svg
          class="h-8 w-8 text-indigo-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
          />
        </svg>
      </div>
      <h1 class="text-xl font-bold text-slate-900">
        {{ t('views.login.title') }}
      </h1>
      <p class="mt-1 text-sm text-slate-600">
        {{ t('views.login.subtitle') }}
      </p>
    </div>

    <!-- 错误提示 -->
    <div
      v-if="errorMessage"
      class="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200"
    >
      {{ errorMessage }}
    </div>

    <!-- 登录卡片 -->
    <div class="card p-5">
      <!-- 步骤 1: 输入邮箱 -->
      <div v-if="step === 'email'">
        <h2 class="text-base font-semibold text-slate-900">
          {{ t('views.login.otp.title') }}
        </h2>
        <p class="mt-1 text-sm text-slate-600">
          {{ t('views.login.otp.subtitle') }}
        </p>

        <form
          class="mt-4 space-y-4"
          @submit.prevent="onSendCode"
        >
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-800">
              {{ t('views.login.emailStep.emailLabel') }}
            </label>
            <input
              v-model="email"
              type="email"
              class="input-field w-full"
              :placeholder="t('views.login.emailStep.emailPlaceholder')"
              autocomplete="email"
              :disabled="isSubmitting"
            >
          </div>

          <button
            type="submit"
            class="btn-primary w-full"
            :disabled="!canSubmit"
          >
            <span v-if="isSubmitting">{{ t('common.working') }}</span>
            <span v-else>{{ t('views.login.otp.sendButton') }}</span>
          </button>
        </form>
      </div>

      <!-- 步骤 2: 输入验证码 -->
      <div v-else-if="step === 'code'">
        <div class="text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg
              class="h-6 w-6 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 class="text-base font-semibold text-slate-900">
            {{ t('views.login.otp.codeTitle') }}
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            {{ t('views.login.otp.codeSubtitle', { email }) }}
          </p>
        </div>

        <form
          class="mt-6 space-y-4"
          @submit.prevent="onVerifyCode"
        >
          <div>
            <input
              v-model="code"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              autocomplete="one-time-code"
              class="input-field w-full text-center text-2xl font-mono tracking-[0.3em]"
              :placeholder="t('views.login.otp.codePlaceholder')"
              :disabled="isSubmitting"
            >
          </div>

          <button
            type="submit"
            class="btn-primary w-full"
            :disabled="!canVerify"
          >
            <span v-if="isSubmitting">{{ t('common.working') }}</span>
            <span v-else>{{ t('views.login.otp.verifyButton') }}</span>
          </button>
        </form>

        <p class="mt-4 text-center text-xs text-slate-500">
          {{ t('views.login.otp.checkSpam') }}
        </p>

        <div class="mt-4 space-y-3">
          <button
            type="button"
            class="btn-secondary w-full"
            :disabled="!canResend"
            @click="onSendCode"
          >
            <span v-if="isSubmitting && !code">{{ t('common.working') }}</span>
            <span v-else-if="!canResend">{{ t('views.login.otp.resendCountdown', { seconds: resendCountdown }) }}</span>
            <span v-else>{{ t('views.login.otp.resendButton') }}</span>
          </button>

          <button
            type="button"
            class="btn-secondary w-full"
            @click="onBackToEmail"
          >
            {{ t('views.login.codeStep.backButton') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { useUserStore, bootstrap } from '@/stores'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const userStore = useUserStore()

// 步骤: 'email' | 'code'
const step = ref('email')
const email = ref('')
const code = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

// 重发倒计时
const resendCountdown = ref(0)
let resendTimer = null

// 计算属性
const canSubmit = computed(() => {
  return !isSubmitting.value && email.value.trim().length > 0 && email.value.includes('@')
})

const canResend = computed(() => {
  return resendCountdown.value === 0 && !isSubmitting.value
})

const canVerify = computed(() => {
  return !isSubmitting.value && code.value.trim().length === 6
})

// 处理 URL 错误参数
watch(() => route.query.error, (error) => {
  if (error) {
    const errorMessages = {
      invalid_token: t('views.login.errors.invalidToken'),
      expired_token: t('views.login.errors.expiredToken'),
      auth_failed: t('views.login.errors.authFailed')
    }
    errorMessage.value = errorMessages[error] || t('views.login.errors.unknown')
    // 清除 URL 参数
    router.replace({ query: {} })
  }
}, { immediate: true })

// 如果已登录，跳转到首页
watch(() => userStore.user, (user) => {
  if (user) {
    const redirect = route.query.redirect || '/'
    router.replace({ path: redirect })
  }
}, { immediate: true })

// 开始重发倒计时
function startResendTimer() {
  resendCountdown.value = 60
  resendTimer = setInterval(() => {
    resendCountdown.value--
    if (resendCountdown.value <= 0) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

// 发送验证码
async function onSendCode() {
  if (!canSubmit.value && step.value === 'email') return
  if (!canResend.value && step.value === 'code') return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // 不设置 emailRedirectTo，Supabase 将发送验证码而非链接
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value.trim()
    })

    if (error) {
      throw error
    }

    step.value = 'code'
    startResendTimer()
  } catch (err) {
    errorMessage.value = err.message || t('views.login.errors.sendCodeFailed')
  } finally {
    isSubmitting.value = false
  }
}

// 验证验证码
async function onVerifyCode() {
  if (!canVerify.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.value.trim(),
      token: code.value.trim(),
      type: 'email'
    })

    if (error) {
      throw error
    }

    if (data.session) {
      await bootstrap()
      const redirect = route.query.redirect || '/'
      router.replace({ path: redirect })
    }
  } catch (err) {
    errorMessage.value = err.message || t('views.login.errors.invalidCode')
  } finally {
    isSubmitting.value = false
  }
}

// 返回邮箱输入步骤
function onBackToEmail() {
  step.value = 'email'
  code.value = ''
  errorMessage.value = ''
  if (resendTimer) {
    clearInterval(resendTimer)
    resendTimer = null
  }
  resendCountdown.value = 0
}

// 监听 auth 状态变化
onMounted(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await bootstrap()
    }
  })

  // 保存 subscription 以便清理
  onUnmounted(() => {
    subscription.unsubscribe()
    if (resendTimer) {
      clearInterval(resendTimer)
    }
  })
})
</script>
