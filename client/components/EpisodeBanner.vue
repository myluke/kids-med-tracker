<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEpisodesStore } from '@/stores'
import RecoveryModal from './RecoveryModal.vue'

const episodesStore = useEpisodesStore()
const { t, d } = useI18n()

const showRecoveryModal = ref(false)

const episode = computed(() => episodesStore.activeEpisode)

const durationDays = computed(() => {
  if (!episode.value) return 0
  const start = new Date(episode.value.startedAt)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
})

const formattedStartDate = computed(() => {
  if (!episode.value) return ''
  return d(new Date(episode.value.startedAt), 'short')
})

const handleRecovered = () => {
  showRecoveryModal.value = false
}
</script>

<template>
  <div
    v-if="episode"
    class="card bg-gradient-to-r from-mint-light to-white border border-mint/30"
  >
    <div class="flex items-center justify-between">
      <div>
        <div class="font-semibold text-mint-dark">
          {{ t('episode.dayCount', { days: durationDays }) }}
        </div>
        <div class="text-sm text-gray-500 mt-0.5">
          {{ t('episode.startedAt', { date: formattedStartDate }) }}
        </div>
      </div>
      <button
        class="px-4 py-2 bg-mint text-white rounded-xl font-medium text-sm shadow-sm active:scale-95 transition-transform"
        @click="showRecoveryModal = true"
      >
        {{ t('episode.markRecovered') }}
      </button>
    </div>
  </div>

  <RecoveryModal
    :show="showRecoveryModal"
    @close="showRecoveryModal = false"
    @recovered="handleRecovered"
  />
</template>
