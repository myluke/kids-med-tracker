<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore, useFamilyStore, createFamily } from '@/stores'

const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()
const familyStore = useFamilyStore()

const familyName = ref('')
const isSubmitting = ref(false)

const hasFamilies = computed(() => (familyStore.families?.length || 0) > 0)
const errorMessage = computed(() => userStore.error || '')

const isSubmitDisabled = computed(() => {
  const nameOk = familyName.value.trim().length > 0
  return isSubmitting.value || !nameOk
})

watchEffect(() => {
  if (hasFamilies.value) router.replace({ path: '/' })
})

async function onCreateFamily() {
  if (isSubmitDisabled.value) return

  isSubmitting.value = true
  try {
    await createFamily({
      name: familyName.value.trim()
    })
    await router.replace({ path: '/' })
  } catch {
    // 错误已在 store 中处理
  } finally {
    isSubmitting.value = false
  }
}

async function onGoHome() {
  await router.replace({ path: '/' })
}
</script>

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
