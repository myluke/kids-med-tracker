<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  show: Boolean,
  loading: Boolean
})

const emit = defineEmits(['close', 'create'])

const { t } = useI18n()
const familyName = ref('')

watch(() => props.show, (val) => {
  if (val) {
    familyName.value = ''
  }
})

const handleCreate = () => {
  const name = familyName.value.trim()
  if (!name) return
  emit('create', name)
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
        <div class="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-lg font-semibold text-gray-800">
              {{ t('views.profile.familySection.createFamilyTitle') }}
            </h3>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
              @click="handleClose"
            >
              <span class="text-xl">&times;</span>
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleCreate">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-2">
                {{ t('views.noFamily.familyNameLabel') }}
              </label>
              <input
                v-model="familyName"
                type="text"
                :placeholder="t('views.noFamily.familyNamePlaceholder')"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-dabo/30 focus:border-dabo"
                :disabled="loading"
              >
            </div>

            <p class="text-sm text-gray-500 mb-4">
              {{ t('views.profile.familySection.createFamilyHint') }}
            </p>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                :disabled="loading"
                @click="handleClose"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                class="flex-1 py-3 rounded-xl bg-dabo text-white font-medium hover:bg-dabo/90 transition-colors disabled:opacity-50"
                :disabled="!familyName.trim() || loading"
              >
                {{ loading ? t('common.working') : t('common.confirm') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
