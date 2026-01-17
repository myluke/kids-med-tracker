<script setup>
import { ref, computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiFetch } from '@/services/api'

const { t } = useI18n()
const toast = inject('toast')

// 状态: 'idle' | 'sendingCode' | 'enterCode' | 'setting'
const step = ref('idle')
const verifyCode = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// 重发倒计时
const resendCountdown = ref(0)
let resendTimer = null

const canSendCode = computed(() => !isLoading.value && resendCountdown.value === 0)
const canSetPassword = computed(() => {
  return !isLoading.value &&
    verifyCode.value.length === 6 &&
    password.value.length >= 6 &&
    password.value === confirmPassword.value
})

const passwordMismatch = computed(() => {
  return password.value && confirmPassword.value && password.value !== confirmPassword.value
})

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
  if (!canSendCode.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    await apiFetch('/api/auth/send-verify-code', { method: 'POST', json: {} })
    step.value = 'enterCode'
    startResendTimer()
  } catch (err) {
    errorMessage.value = err.message || t('views.profile.password.sendCodeFailed')
  } finally {
    isLoading.value = false
  }
}

// 设置密码
async function onSetPassword() {
  if (!canSetPassword.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    await apiFetch('/api/auth/set-password', {
      method: 'POST',
      json: {
        password: password.value,
        verifyCode: verifyCode.value,
      }
    })
    toast?.(t('views.profile.password.setSuccess'))
    onReset()
  } catch (err) {
    errorMessage.value = err.message || t('views.profile.password.setFailed')
  } finally {
    isLoading.value = false
  }
}

// 重置状态
function onReset() {
  step.value = 'idle'
  verifyCode.value = ''
  password.value = ''
  confirmPassword.value = ''
  errorMessage.value = ''
  if (resendTimer) {
    clearInterval(resendTimer)
    resendTimer = null
  }
  resendCountdown.value = 0
}
</script>

<template>
  <div class="card">
    <h3 class="font-semibold text-gray-800 mb-4">
      {{ t('views.profile.password.title') }}
    </h3>

    <p class="text-sm text-gray-500 mb-4">
      {{ t('views.profile.password.description') }}
    </p>

    <!-- 错误提示 -->
    <div
      v-if="errorMessage"
      class="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200"
    >
      {{ errorMessage }}
    </div>

    <!-- 步骤 1: 发送验证码 -->
    <div v-if="step === 'idle'">
      <button
        class="w-full py-3 rounded-xl bg-dabo text-white font-medium hover:bg-dabo/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isLoading"
        @click="onSendCode"
      >
        <span v-if="isLoading">{{ t('common.working') }}</span>
        <span v-else>{{ t('views.profile.password.sendCode') }}</span>
      </button>
    </div>

    <!-- 步骤 2: 输入验证码和新密码 -->
    <div
      v-else-if="step === 'enterCode'"
      class="space-y-4"
    >
      <!-- 验证码输入 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('views.profile.password.codeLabel') }}
        </label>
        <input
          v-model="verifyCode"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="6"
          autocomplete="one-time-code"
          class="w-full px-4 py-3 rounded-xl text-center text-xl font-mono tracking-[0.3em] bg-gray-50 border-2 border-transparent focus:border-dabo focus:bg-white focus:outline-none transition-all"
          :placeholder="t('views.profile.password.codePlaceholder')"
          :disabled="isLoading"
        >
      </div>

      <!-- 新密码输入 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('views.profile.password.newPasswordLabel') }}
        </label>
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          class="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-dabo focus:bg-white focus:outline-none transition-all"
          :placeholder="t('views.profile.password.newPasswordPlaceholder')"
          :disabled="isLoading"
        >
        <p class="mt-1 text-xs text-gray-400">
          {{ t('views.profile.password.passwordHint') }}
        </p>
      </div>

      <!-- 确认密码输入 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('views.profile.password.confirmPasswordLabel') }}
        </label>
        <input
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          class="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-dabo focus:bg-white focus:outline-none transition-all"
          :class="{ 'border-rose-300 focus:border-rose-400': passwordMismatch }"
          :placeholder="t('views.profile.password.confirmPasswordPlaceholder')"
          :disabled="isLoading"
        >
        <p
          v-if="passwordMismatch"
          class="mt-1 text-xs text-rose-500"
        >
          {{ t('views.profile.password.passwordMismatch') }}
        </p>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-3 pt-2">
        <button
          class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          :disabled="isLoading"
          @click="onReset"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          class="flex-1 py-3 rounded-xl bg-dabo text-white font-medium hover:bg-dabo/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canSetPassword"
          @click="onSetPassword"
        >
          <span v-if="isLoading">{{ t('common.working') }}</span>
          <span v-else>{{ t('views.profile.password.setButton') }}</span>
        </button>
      </div>

      <!-- 重发验证码 -->
      <div class="text-center pt-2">
        <button
          class="text-sm text-gray-500 hover:text-dabo transition-colors disabled:opacity-50 disabled:hover:text-gray-500"
          :disabled="!canSendCode"
          @click="onSendCode"
        >
          <span v-if="resendCountdown > 0">
            {{ t('views.profile.password.resendCountdown', { seconds: resendCountdown }) }}
          </span>
          <span v-else>{{ t('views.profile.password.resendCode') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
