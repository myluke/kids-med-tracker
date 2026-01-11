<template>
  <div class="mx-auto w-full max-w-md px-4 pt-6 pb-24">
    <div class="card p-5">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
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
              d="M12 6v6l4 2"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div class="min-w-0 flex-1">
          <h1 class="text-lg font-semibold text-slate-900">
            {{ t('views.noFamily.title') }}
          </h1>
          <p class="mt-1 text-sm leading-6 text-slate-600">
            {{ t('views.noFamily.subtitle') }}
          </p>

          <ul class="mt-4 space-y-2 text-sm text-slate-700">
            <li class="flex items-start gap-2">
              <span class="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-amber-500" />
              <span>{{ t('views.noFamily.bullets.trackTogether') }}</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-amber-500" />
              <span>{{ t('views.noFamily.bullets.invites') }}</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-amber-500" />
              <span>{{ t('views.noFamily.bullets.privacy') }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card mt-4 p-5">
      <h2 class="text-base font-semibold text-slate-900">
        {{ t('views.noFamily.createTitle') }}
      </h2>
      <p class="mt-1 text-sm text-slate-600">
        {{ t('views.noFamily.createSubtitle') }}
      </p>

      <form
        class="mt-4 space-y-4"
        @submit.prevent="onCreateFamily"
      >
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-800">
            {{ t('views.noFamily.familyNameLabel') }}
          </label>
          <input
            v-model="familyName"
            class="input-field w-full"
            :placeholder="t('views.noFamily.familyNamePlaceholder')"
            autocomplete="off"
            :disabled="isSubmitting"
          >
        </div>

        <div class="space-y-2">
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
          class="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="isSubmitDisabled"
        >
          <span v-if="isSubmitting">{{ t('common.working') }}</span>
          <span v-else>{{ t('views.noFamily.createButton') }}</span>
        </button>

        <button
          type="button"
          class="btn-secondary w-full"
          :disabled="isSubmitting"
          @click="onGoHome"
        >
          {{ t('views.noFamily.backToHome') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRecordsStore } from '@/stores/records'

const router = useRouter()
const { t } = useI18n()
const records = useRecordsStore()

const familyName = ref('')
const isSubmitting = ref(false)

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const turnstileEl = ref(null)
const turnstileToken = ref('')
const turnstileWidgetId = ref(null)
const turnstileAvailable = ref(true)

const hasFamilies = computed(() => (records.families?.length || 0) > 0)
const errorMessage = computed(() => records.error || '')

const isSubmitDisabled = computed(() => {
  const nameOk = familyName.value.trim().length > 0
  const tokenOk = !!turnstileToken.value
  return isSubmitting.value || !nameOk || !tokenOk
})

watchEffect(() => {
  if (hasFamilies.value) router.replace({ path: '/' })
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
      callback: (token) => {
        turnstileToken.value = token
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

async function onCreateFamily() {
  if (isSubmitDisabled.value) return

  isSubmitting.value = true
  try {
    await records.createFamily({
      name: familyName.value.trim(),
      turnstileToken: turnstileToken.value
    })
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
