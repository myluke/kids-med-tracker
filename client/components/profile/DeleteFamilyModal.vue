<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  show: Boolean,
  loading: Boolean,
  familyName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'confirm'])

const { t } = useI18n()

const handleConfirm = () => {
  emit('confirm')
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="handleClose"
      >
        <div class="absolute inset-0 bg-black/50" />
        <div class="modal-content relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-red-600">
              {{ t('views.profile.familySection.deleteFamilyTitle') }}
            </h3>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
              @click="handleClose"
            >
              <span class="text-xl">&times;</span>
            </button>
          </div>

          <!-- Warning content -->
          <div class="mb-6">
            <div class="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
              <svg
                class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p class="text-sm text-red-700 font-medium mb-2">
                  {{ t('views.profile.familySection.deleteFamilyWarning', { name: familyName }) }}
                </p>
                <ul class="text-sm text-red-600 list-disc list-inside space-y-1">
                  <li>{{ t('views.profile.familySection.deleteWarningChildren') }}</li>
                  <li>{{ t('views.profile.familySection.deleteWarningRecords') }}</li>
                  <li>{{ t('views.profile.familySection.deleteWarningMembers') }}</li>
                </ul>
              </div>
            </div>
            <p class="mt-3 text-sm text-gray-500 text-center">
              {{ t('views.profile.familySection.deleteIrreversible') }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              :disabled="loading"
              @click="handleClose"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              :disabled="loading"
              @click="handleConfirm"
            >
              {{ loading ? t('common.working') : t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
