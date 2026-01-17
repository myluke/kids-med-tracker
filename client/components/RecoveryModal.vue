<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEpisodesStore } from '@/stores'
import BottomSheet from './BottomSheet.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'recovered'])

const episodesStore = useEpisodesStore()
const { t } = useI18n()
const toast = inject('toast')

const loading = ref(false)
const stats = ref(null)

const episode = computed(() => episodesStore.activeEpisode)

// Load stats when modal opens
watch(() => props.show, async (val) => {
  if (val && episode.value) {
    try {
      stats.value = await episodesStore.getStats(episode.value.id)
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }
})

const handleConfirm = async () => {
  if (loading.value) return
  loading.value = true

  try {
    await episodesStore.markRecovered()
    toast?.(t('episode.recovered'))
    emit('recovered')
    emit('close')
  } catch (e) {
    console.error('Failed to mark recovered:', e)
    toast?.(t('common.error'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BottomSheet
    :show="show"
    :max-height="60"
    @close="emit('close')"
  >
    <div class="py-4">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="text-4xl mb-2">
          🎉
        </div>
        <h2 class="text-xl font-bold text-gray-800">
          {{ t('episode.confirmRecovery') }}
        </h2>
        <p class="text-sm text-gray-500 mt-1">
          {{ t('episode.recoveryConfirmSubtitle') }}
        </p>
      </div>

      <!-- Stats Summary -->
      <div
        v-if="stats"
        class="bg-gray-50 rounded-2xl p-4 mb-6"
      >
        <h3 class="text-sm font-semibold text-gray-600 mb-3">
          {{ t('episode.thisPeriodStats') }}
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-800">
              {{ stats.durationDays }}
            </div>
            <div class="text-xs text-gray-500">
              {{ t('episode.stats.duration') }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-800">
              {{ stats.medCount }}
            </div>
            <div class="text-xs text-gray-500">
              {{ t('episode.stats.medCount') }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-800">
              {{ stats.maxTemp ? stats.maxTemp + '°' : '--' }}
            </div>
            <div class="text-xs text-gray-500">
              {{ t('episode.stats.maxTemp') }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-800">
              {{ stats.avgCoughPerDay }}
            </div>
            <div class="text-xs text-gray-500">
              {{ t('episode.stats.avgCough') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div
        v-else
        class="bg-gray-50 rounded-2xl p-8 mb-6 text-center"
      >
        <div class="text-gray-400">
          {{ t('common.loading') }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          class="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium"
          @click="emit('close')"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          class="flex-1 py-3 px-4 bg-mint text-white rounded-xl font-medium disabled:opacity-50"
          :disabled="loading"
          @click="handleConfirm"
        >
          {{ loading ? t('common.loading') : t('episode.confirmRecoveryBtn') }}
        </button>
      </div>
    </div>
  </BottomSheet>
</template>
