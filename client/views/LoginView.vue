<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { useUserStore, bootstrap } from '@/stores'
import { apiFetch } from '@/services/api'
import TurnstileWidget from '@/components/TurnstileWidget.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const userStore = useUserStore()

// 步骤: 'email' | 'password' | 'code'
const step = ref('email')
const email = ref('')
const password = ref('')
const code = ref('')
const turnstileToken = ref('')
const hasPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const turnstileRef = ref(null)

// 重发倒计时
const resendCountdown = ref(0)
let resendTimer = null

// 计算属性
const canCheckEmail = computed(() => {
  return !isSubmitting.value &&
    email.value.trim().length > 0 &&
    email.value.includes('@') &&
    turnstileToken.value
})

const canSignInPassword = computed(() => {
  return !isSubmitting.value &&
    password.value.length >= 1 &&
    turnstileToken.value
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

// 重置 Turnstile
function resetTurnstile() {
  turnstileToken.value = ''
  turnstileRef.value?.reset()
}

// 步骤 1: 检测邮箱是否设置密码
async function onCheckEmail() {
  if (!canCheckEmail.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const data = await apiFetch('/api/auth/check-password', {
      method: 'POST',
      json: {
        email: email.value.trim(),
        turnstileToken: turnstileToken.value,
      }
    })

    hasPassword.value = data.hasPassword

    if (data.hasPassword) {
      // 有密码，进入密码登录步骤
      step.value = 'password'
      resetTurnstile()
    } else {
      // 无密码，发送 OTP 并进入验证码步骤
      await sendOtp()
    }
  } catch (err) {
    errorMessage.value = err.message || t('views.login.errors.unknown')
    resetTurnstile()
  } finally {
    isSubmitting.value = false
  }
}

// 发送 OTP
async function sendOtp() {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value.trim()
  })

  if (error) {
    throw error
  }

  step.value = 'code'
  startResendTimer()
}

// 步骤 2a: 密码登录
async function onSignInPassword() {
  if (!canSignInPassword.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const data = await apiFetch('/api/auth/sign-in-password', {
      method: 'POST',
      json: {
        email: email.value.trim(),
        password: password.value,
        turnstileToken: turnstileToken.value,
      }
    })

    // 设置 session
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      await bootstrap()
      const redirect = route.query.redirect || '/'
      router.replace({ path: redirect })
    }
  } catch (err) {
    errorMessage.value = err.message || t('views.login.errors.invalidPassword')
    resetTurnstile()
  } finally {
    isSubmitting.value = false
  }
}

// 步骤 2b: 切换到验证码登录
async function onSwitchToOtp() {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await sendOtp()
    resetTurnstile()
  } catch (err) {
    errorMessage.value = err.message || t('views.login.errors.sendCodeFailed')
  } finally {
    isSubmitting.value = false
  }
}

// 重发验证码
async function onResendCode() {
  if (!canResend.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value.trim()
    })

    if (error) {
      throw error
    }

    startResendTimer()
  } catch (err) {
    errorMessage.value = err.message || t('views.login.errors.sendCodeFailed')
  } finally {
    isSubmitting.value = false
  }
}

// 步骤 3: 验证验证码
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
  password.value = ''
  code.value = ''
  errorMessage.value = ''
  resetTurnstile()
  if (resendTimer) {
    clearInterval(resendTimer)
    resendTimer = null
  }
  resendCountdown.value = 0
}

// 监听 auth 状态变化（仅用于处理外部登录，如 OAuth）
onMounted(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    // 密码登录和 OTP 登录已在各自的处理函数中调用 bootstrap()
    // 这里只处理外部 OAuth 回调等场景
    if (event === 'SIGNED_IN' && session && !isSubmitting.value) {
      await bootstrap()
      const redirect = route.query.redirect || '/'
      router.replace({ path: redirect })
    }
  })

  onUnmounted(() => {
    subscription.unsubscribe()
    if (resendTimer) {
      clearInterval(resendTimer)
    }
  })
})
</script>

<template>
  <div class="login-page">
    <!-- 装饰性背景元素 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="deco-circle deco-1" />
      <div class="deco-circle deco-2" />
      <div class="deco-circle deco-3" />
      <div class="deco-circle deco-4" />
    </div>

    <!-- 主内容区 -->
    <div class="relative z-10 min-h-full flex flex-col items-center justify-center px-6 py-12">
      <!-- 品牌区 -->
      <div class="brand-section mb-8 text-center">
        <img
          src="/logo.svg"
          alt="Logo"
          class="w-20 h-20 mx-auto mb-4 drop-shadow-lg"
        >
        <h1 class="text-2xl font-bold text-gray-800 mb-2">
          {{ t('app.title') }}
        </h1>
        <p class="text-gray-500 text-sm">
          {{ t('views.login.subtitle') }}
        </p>
      </div>

      <!-- 错误提示 -->
      <div
        v-if="errorMessage"
        class="w-full max-w-sm mb-4 rounded-2xl bg-rose-50/80 backdrop-blur-sm p-4 text-sm text-rose-700 ring-1 ring-rose-200/50 error-card"
      >
        {{ errorMessage }}
      </div>

      <!-- 登录卡片 -->
      <div class="login-card">
        <!-- 步骤 1: 输入邮箱 -->
        <div v-if="step === 'email'">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-dabo/10 flex items-center justify-center">
              <svg
                class="w-5 h-5 text-dabo"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-800">
                {{ t('views.login.otp.title') }}
              </h2>
              <p class="text-xs text-gray-500">
                {{ t('views.login.emailStep.subtitle') }}
              </p>
            </div>
          </div>

          <form @submit.prevent="onCheckEmail">
            <div class="mb-4">
              <label class="mb-2 block text-sm font-medium text-gray-700">
                {{ t('views.login.emailStep.emailLabel') }}
              </label>
              <input
                v-model="email"
                type="email"
                class="login-input"
                :placeholder="t('views.login.emailStep.emailPlaceholder')"
                autocomplete="email"
                :disabled="isSubmitting"
              >
            </div>

            <!-- Turnstile -->
            <div class="mb-4">
              <TurnstileWidget
                ref="turnstileRef"
                v-model="turnstileToken"
                :disabled="isSubmitting"
              />
            </div>

            <button
              type="submit"
              class="login-btn"
              :disabled="!canCheckEmail"
            >
              <span
                v-if="isSubmitting"
                class="flex items-center justify-center gap-2"
              >
                <svg
                  class="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {{ t('common.working') }}
              </span>
              <span v-else>{{ t('views.login.emailStep.continueButton') }}</span>
            </button>
          </form>
        </div>

        <!-- 步骤 2a: 密码登录 -->
        <div v-else-if="step === 'password'">
          <div class="text-center mb-6">
            <div class="mx-auto mb-4 w-14 h-14 rounded-full bg-dabo/10 flex items-center justify-center">
              <svg
                class="w-7 h-7 text-dabo"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 class="text-base font-semibold text-gray-800">
              {{ t('views.login.password.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              {{ email }}
            </p>
          </div>

          <form @submit.prevent="onSignInPassword">
            <div class="mb-4">
              <input
                v-model="password"
                type="password"
                class="login-input"
                :placeholder="t('views.login.password.placeholder')"
                autocomplete="current-password"
                :disabled="isSubmitting"
              >
            </div>

            <!-- Turnstile -->
            <div class="mb-4">
              <TurnstileWidget
                ref="turnstileRef"
                v-model="turnstileToken"
                :disabled="isSubmitting"
              />
            </div>

            <button
              type="submit"
              class="login-btn"
              :disabled="!canSignInPassword"
            >
              <span
                v-if="isSubmitting"
                class="flex items-center justify-center gap-2"
              >
                <svg
                  class="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {{ t('common.working') }}
              </span>
              <span v-else>{{ t('views.login.password.loginButton') }}</span>
            </button>
          </form>

          <div class="mt-5 pt-5 border-t border-gray-100 space-y-3">
            <button
              type="button"
              class="login-btn-secondary"
              :disabled="isSubmitting"
              @click="onSwitchToOtp"
            >
              {{ t('views.login.password.useOtp') }}
            </button>

            <button
              type="button"
              class="login-btn-text"
              @click="onBackToEmail"
            >
              ← {{ t('views.login.codeStep.backButton') }}
            </button>
          </div>
        </div>

        <!-- 步骤 2b: 输入验证码 -->
        <div v-else-if="step === 'code'">
          <div class="text-center mb-6">
            <div class="mx-auto mb-4 w-14 h-14 rounded-full bg-mint/20 flex items-center justify-center">
              <svg
                class="w-7 h-7 text-mint-dark"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 class="text-base font-semibold text-gray-800">
              {{ t('views.login.otp.codeTitle') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              {{ t('views.login.otp.codeSubtitle', { email }) }}
            </p>
          </div>

          <form @submit.prevent="onVerifyCode">
            <div class="mb-4">
              <input
                v-model="code"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                autocomplete="one-time-code"
                class="login-input text-center text-2xl font-mono tracking-[0.4em]"
                :placeholder="t('views.login.otp.codePlaceholder')"
                :disabled="isSubmitting"
              >
            </div>

            <button
              type="submit"
              class="login-btn"
              :disabled="!canVerify"
            >
              <span
                v-if="isSubmitting"
                class="flex items-center justify-center gap-2"
              >
                <svg
                  class="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {{ t('common.working') }}
              </span>
              <span v-else>{{ t('views.login.otp.verifyButton') }}</span>
            </button>
          </form>

          <p class="mt-4 text-center text-xs text-gray-400">
            {{ t('views.login.otp.checkSpam') }}
          </p>

          <div class="mt-5 pt-5 border-t border-gray-100 space-y-3">
            <button
              type="button"
              class="login-btn-secondary"
              :disabled="!canResend"
              @click="onResendCode"
            >
              <span v-if="isSubmitting && !code">{{ t('common.working') }}</span>
              <span v-else-if="!canResend">{{ t('views.login.otp.resendCountdown', { seconds: resendCountdown }) }}</span>
              <span v-else>{{ t('views.login.otp.resendButton') }}</span>
            </button>

            <button
              type="button"
              class="login-btn-text"
              @click="onBackToEmail"
            >
              ← {{ t('views.login.codeStep.backButton') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 页面背景 - 固定定位覆盖全屏 */
.login-page {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow-y: auto;
  background: linear-gradient(
    165deg,
    #E8ECF8 0%,
    #EEF2F7 35%,
    #F8FAFC 100%
  );
}

/* 装饰性圆形 */
.deco-circle {
  @apply absolute rounded-full;
  background: linear-gradient(135deg, rgba(139, 157, 217, 0.15) 0%, rgba(125, 211, 192, 0.1) 100%);
}

.deco-1 {
  width: 280px;
  height: 280px;
  top: -80px;
  right: -60px;
  animation: float 8s ease-in-out infinite;
}

.deco-2 {
  width: 180px;
  height: 180px;
  top: 25%;
  left: -50px;
  animation: float 6s ease-in-out infinite reverse;
}

.deco-3 {
  width: 120px;
  height: 120px;
  bottom: 20%;
  right: -30px;
  background: linear-gradient(135deg, rgba(245, 165, 165, 0.12) 0%, rgba(253, 232, 236, 0.15) 100%);
  animation: float 7s ease-in-out infinite;
}

.deco-4 {
  width: 200px;
  height: 200px;
  bottom: -60px;
  left: 20%;
  animation: float 9s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.02); }
}

/* 品牌区入场动画 */
.brand-section {
  animation: fadeSlideUp 0.6s ease-out;
}

/* 登录卡片 */
.login-card {
  @apply w-full max-w-sm p-6 rounded-3xl;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow:
    0 4px 24px rgba(139, 157, 217, 0.12),
    0 1px 3px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  animation: fadeSlideUp 0.6s ease-out 0.1s both;
}

/* 错误卡片动画 */
.error-card {
  animation: shake 0.4s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

/* 输入框 */
.login-input {
  @apply w-full px-4 py-3.5 rounded-xl text-base text-gray-800 transition-all duration-200;
  background: rgba(248, 250, 252, 0.8);
  border: 2px solid transparent;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.login-input:focus {
  @apply outline-none;
  background: white;
  border-color: #8B9DD9;
  box-shadow:
    0 0 0 3px rgba(139, 157, 217, 0.15),
    inset 0 1px 3px rgba(0, 0, 0, 0.02);
}

.login-input:disabled {
  @apply opacity-60 cursor-not-allowed;
}

.login-input::placeholder {
  @apply text-gray-400;
}

/* 主按钮 */
.login-btn {
  @apply w-full py-4 px-6 rounded-xl text-white font-semibold transition-all duration-200;
  background: linear-gradient(135deg, #8B9DD9 0%, #6B7EC9 100%);
  box-shadow:
    0 4px 12px rgba(107, 126, 201, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(107, 126, 201, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.login-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
  transform: none;
}

/* 次要按钮 */
.login-btn-secondary {
  @apply w-full py-3 px-4 rounded-xl text-gray-700 font-medium transition-all duration-200;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.login-btn-secondary:hover:not(:disabled) {
  background: rgba(248, 250, 252, 1);
  border-color: rgba(0, 0, 0, 0.1);
}

.login-btn-secondary:disabled {
  @apply opacity-50 cursor-not-allowed;
}

/* 文字按钮 */
.login-btn-text {
  @apply w-full py-2 text-sm text-gray-500 font-medium transition-colors;
}

.login-btn-text:hover {
  @apply text-dabo;
}

/* 入场动画 */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
