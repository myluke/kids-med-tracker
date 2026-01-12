<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFamilyStore } from '@/stores'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])

const familyStore = useFamilyStore()
const { t } = useI18n()

const inviteUrl = ref('')
const expiresAt = ref('')
const loading = ref(false)
const copied = ref(false)
const error = ref('')

watch(() => props.show, async (val) => {
  if (val) {
    inviteUrl.value = ''
    expiresAt.value = ''
    copied.value = false
    error.value = ''
    await generateInvite()
  }
})

const generateInvite = async () => {
  if (!familyStore.currentFamilyId) return

  loading.value = true
  error.value = ''

  try {
    const result = await familyStore.createInvite({ familyId: familyStore.currentFamilyId })
    inviteUrl.value = result.inviteUrl
    expiresAt.value = result.expiresAt
  } catch (e) {
    error.value = e.message || t('common.error')
  } finally {
    loading.value = false
  }
}

const copyToClipboard = async () => {
  if (!inviteUrl.value) return

  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = inviteUrl.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
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
              {{ t('views.profile.familySection.inviteTitle') }}
            </h3>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
              @click="handleClose"
            >
              <span class="text-xl">&times;</span>
            </button>
          </div>

          <!-- Content -->
          <div
            v-if="loading"
            class="py-8 text-center text-gray-500"
          >
            {{ t('views.profile.familySection.generating') }}
          </div>

          <div
            v-else-if="error"
            class="py-8 text-center text-red-500"
          >
            {{ error }}
          </div>

          <div
            v-else
            class="space-y-4"
          >
            <p class="text-sm text-gray-500">
              {{ t('views.profile.familySection.inviteSubtitle') }}
            </p>

            <!-- Link box -->
            <div class="p-3 bg-gray-50 rounded-xl">
              <input
                :value="inviteUrl"
                readonly
                class="w-full bg-transparent text-sm text-gray-700 break-all outline-none"
                @focus="$event.target.select()"
              >
            </div>

            <!-- Expires info -->
            <p class="text-xs text-gray-400 flex items-center gap-1">
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ t('views.profile.familySection.inviteExpires') }}
            </p>

            <!-- Copy button -->
            <button
              class="w-full py-3 rounded-xl font-medium transition-colors"
              :class="copied ? 'bg-green-500 text-white' : 'bg-dabo text-white hover:bg-dabo/90'"
              @click="copyToClipboard"
            >
              {{ copied ? t('views.profile.familySection.copied') : t('views.profile.familySection.copyLink') }}
            </button>
          </div>
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
