<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEpisodesStore, useChildrenStore } from '@/stores'
import ChildTabs from '@/components/ChildTabs.vue'
import EpisodeCard from '@/components/EpisodeCard.vue'
import PullToRefresh from '@/components/PullToRefresh.vue'

const episodesStore = useEpisodesStore()
const childrenStore = useChildrenStore()
const { t } = useI18n()

const loading = ref(false)

const currentEpisode = computed(() => episodesStore.activeEpisode)
const historyEpisodes = computed(() => episodesStore.historyEpisodes)
const hasEpisodes = computed(() =>
  currentEpisode.value || historyEpisodes.value.length > 0
)

// Load episodes when child changes
watch(
  () => childrenStore.currentChild,
  async (childId) => {
    if (childId) {
      loading.value = true
      try {
        await episodesStore.loadHistoryEpisodes(childId)
      } finally {
        loading.value = false
      }
    }
  },
  { immediate: true }
)

const onRefresh = async (done) => {
  try {
    const childId = childrenStore.currentChild
    if (childId) {
      await episodesStore.loadHistoryEpisodes(childId)
    }
  } finally {
    done()
  }
}

const handleEpisodeClick = (episode) => {
  // TODO: Navigate to episode detail view
  console.log('Episode clicked:', episode.id)
}
</script>

<template>
  <PullToRefresh @refresh="onRefresh">
    <div class="py-6 space-y-5">
      <!-- Child tabs -->
      <ChildTabs />

      <!-- Title -->
      <div class="px-1">
        <h2 class="text-lg font-bold text-gray-800">
          {{ t('episode.history') }}
        </h2>
      </div>

      <!-- Loading state -->
      <div
        v-if="loading && !hasEpisodes"
        class="card text-center py-8"
      >
        <div class="text-gray-400">
          {{ t('common.loading') }}
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!hasEpisodes"
        class="card text-center py-8"
      >
        <div class="text-4xl mb-2">
          🏥
        </div>
        <div class="text-gray-500">
          {{ t('episode.empty') }}
        </div>
      </div>

      <!-- Episode list -->
      <template v-else>
        <!-- Current episode -->
        <div
          v-if="currentEpisode"
          class="space-y-2"
        >
          <div class="text-sm font-medium text-gray-500 px-1">
            {{ t('episode.current') }}
          </div>
          <EpisodeCard
            :episode="currentEpisode"
            @click="handleEpisodeClick"
          />
        </div>

        <!-- History episodes -->
        <div
          v-if="historyEpisodes.length > 0"
          class="space-y-2"
        >
          <div class="text-sm font-medium text-gray-500 px-1">
            {{ t('episode.historySection') }}
          </div>
          <div class="space-y-3">
            <EpisodeCard
              v-for="episode in historyEpisodes"
              :key="episode.id"
              :episode="episode"
              @click="handleEpisodeClick"
            />
          </div>
        </div>
      </template>
    </div>
  </PullToRefresh>
</template>
