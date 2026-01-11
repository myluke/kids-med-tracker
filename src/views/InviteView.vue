<template>
  <div class="mx-auto w-full max-w-md px-4 pt-6 pb-24">
    <div class="card p-5">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900">
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12l2 2 4-4"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
            />
          </svg>
        </div>

        <div class="min-w-0 flex-1">
          <h1 class="text-lg font-semibold text-slate-900">
            {{ t('views.invite.title') }}
          </h1>
          <p class="mt-1 text-sm leading-6 text-slate-600">
            {{ t('views.invite.subtitle') }}
          </p>

          <div class="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
            <div class="flex items-center justify-between gap-3">
              <span class="font-medium text-slate-700">{{ t('views.invite.tokenLabel') }}</span>
              <span class="font-mono text-slate-700">{{ tokenPreview }}</span>
            </div>
          </div>

          <div
            v-if="!token"
            class="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200"
          >
            {{ t('views.invite.missingToken') }}
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-4 p-5">
      <h2 class="text-base font-semibold text-slate-900">
        {{ t('views.invite.verifyTitle') }}
      </h2>
      <p class="mt-1 text-sm text-slate-600">
        {{ t('views.invite.verifySubtitle') }}
      </p>

      <div class="mt-4 space-y-2">
        <div
          v-if="siteKey"
          ref="turnstileEl"
          class="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"
        />

        <div
          v-if="!turnstileAvailable || !siteKey"
          class="space-y-2"
        >
          <div class="text-sm text-slate-600">
            {{ siteKey ? t('turnstile.unavailable') : t('turnstile.missingSiteKey') }}
          </div>
          <input
            v-model="turnstileToken"
            class="input-field w-full"
            :placeholder="t('turnstile.manualTokenPlaceholder')"
            autocomplete="off"
            :disabled="isSubmitting"
          >
        </div>

        <div
          v-if="!turnstileToken"
          class="text-xs text-slate-500"
        >
          {{ t('turnstile.hint') }}
        </div>
      </div>

      <div
        v-if="errorMessage"
        class="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="isSuccess"
        class="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200"
      >
        {{ t('views.invite.success') }}
      </div>

      <div class="mt-4 space-y-3">
        <button
          class="btn-primary w-full"
          :disabled="isAcceptDisabled"
          @click="onAccept"
        >
          <span v-if="isSubmitting">{{ t('common.working') }}</span>
          <span v-else>{{ t('views.invite.acceptButton') }}</span>
        </button>

        <button
          class="btn-secondary w-full"
          :disabled="isSubmitting"
          @click="onGoHome"
        >
          {{ t('views.invite.backToHome') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRecordsStore } from '@/stores/records'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const records = useRecordsStore()

const token = computed(() => String(route.params.token || '').trim())
const tokenPreview = computed(() => {
  if (!token.value) return t('views.invite.tokenPreviewEmpty')
  const head = token.value.slice(0, 6)
  const tail = token.value.slice(-4)
  return `${head}…${tail}`
})

const isSubmitting = ref(false)
const isSuccess = ref(false)

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const turnstileEl = ref(null)
const turnstileToken = ref('')
const turnstileWidgetId = ref(null)
const turnstileAvailable = ref(true)

const errorMessage = computed(() => records.error || '')

const isAcceptDisabled = computed(() => {
  const tokenOk = !!token.value
  const tsOk = !!turnstileToken.value
  return isSubmitting.value || isSuccess.value || !tokenOk || !tsOk
})

function mountTurnstile() {
  turnstileToken.value = ''
  turnstileAvailable.value = true

  if (!siteKey || !turnstileEl.value) return
  if (!window.turnstile) {
    turnstileAvailable.value = false
    return
  }

  try {
    turnstileWidgetId.value = window.turnstile.render(turnstileEl.value, {
      sitekey: siteKey,
      theme: 'light',
      callback: (tokenValue) => {
        turnstileToken.value = tokenValue
      },
      'error-callback': () => {
        turnstileToken.value = ''
      },
      'expired-callback': () => {
        turnstileToken.value = ''
      }
    })
  } catch {
    turnstileAvailable.value = false
  }
}

function resetTurnstile() {
  if (!window.turnstile) {
    turnstileToken.value = ''
    return
  }
  if (turnstileWidgetId.value == null) {
    turnstileToken.value = ''
    return
  }

  try {
    window.turnstile.reset(turnstileWidgetId.value)
  } finally {
    turnstileToken.value = ''
  }
}

async function onAccept() {
  if (isAcceptDisabled.value) return

  isSubmitting.value = true
  isSuccess.value = false

  try {
    await records.acceptInvite({
      token: token.value,
      turnstileToken: turnstileToken.value
    })
    isSuccess.value = true
    await router.replace({ path: '/' })
  } catch {
    resetTurnstile()
  } finally {
    isSubmitting.value = false
  }
}

async function onGoHome() {
  await router.replace({ path: '/' })
}

onMounted(() => {
  mountTurnstile()
})

onUnmounted(() => {
  if (!window.turnstile) return
  if (turnstileWidgetId.value == null) return

  try {
    window.turnstile.remove(turnstileWidgetId.value)
  } finally {
    turnstileWidgetId.value = null
  }
})
</script>
