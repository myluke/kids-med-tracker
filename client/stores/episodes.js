import { defineStore, storeToRefs } from 'pinia'
import { ref, computed } from 'vue'
import * as episodeService from '@/services/episodeService'
import { useChildrenStore } from './children'
import { useFamilyStore } from './family'

export const useEpisodesStore = defineStore('episodes', () => {
  // State
  const episodesByChild = ref({}) // { [childId]: Episode[] }
  const activeEpisodeByChild = ref({}) // { [childId]: Episode | null }
  const loading = ref(false)

  // Get other stores
  const childrenStore = useChildrenStore()
  const { currentChild } = storeToRefs(childrenStore)

  /**
   * Current child's active episode
   */
  const activeEpisode = computed(() => {
    if (!currentChild.value) return null
    return activeEpisodeByChild.value[currentChild.value] || null
  })

  /**
   * Current child's history episodes (recovered)
   */
  const historyEpisodes = computed(() => {
    if (!currentChild.value) return []
    const episodes = episodesByChild.value[currentChild.value] || []
    return episodes
      .filter(e => e.status === 'recovered')
      .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
  })

  /**
   * Load active episode for a child
   */
  const loadActiveEpisode = async (childId) => {
    const familyStore = useFamilyStore()
    const familyId = familyStore.currentFamilyId
    if (!familyId || !childId) return null

    loading.value = true
    try {
      const episode = await episodeService.getActiveEpisode({
        familyId,
        childId
      })

      activeEpisodeByChild.value = {
        ...activeEpisodeByChild.value,
        [childId]: episode
      }

      return episode
    } finally {
      loading.value = false
    }
  }

  /**
   * Load history episodes for a child
   */
  const loadHistoryEpisodes = async (childId, limit = 20) => {
    const familyStore = useFamilyStore()
    const familyId = familyStore.currentFamilyId
    if (!familyId || !childId) return []

    loading.value = true
    try {
      const episodes = await episodeService.getEpisodes({
        familyId,
        childId,
        status: 'all',
        limit
      })

      episodesByChild.value = {
        ...episodesByChild.value,
        [childId]: episodes
      }

      // Update active episode cache
      const active = episodes.find(e => e.status === 'active')
      if (active) {
        activeEpisodeByChild.value = {
          ...activeEpisodeByChild.value,
          [childId]: active
        }
      }

      return episodes
    } finally {
      loading.value = false
    }
  }

  /**
   * Mark current episode as recovered
   */
  const markRecovered = async () => {
    const familyStore = useFamilyStore()
    const familyId = familyStore.currentFamilyId
    const childId = currentChild.value
    const episode = activeEpisode.value

    if (!familyId || !childId || !episode) {
      throw new Error('No active episode to mark as recovered')
    }

    loading.value = true
    try {
      const updated = await episodeService.endEpisode({
        episodeId: episode.id,
        familyId
      })

      // Clear active episode
      activeEpisodeByChild.value = {
        ...activeEpisodeByChild.value,
        [childId]: null
      }

      // Add to history
      const existing = episodesByChild.value[childId] || []
      episodesByChild.value = {
        ...episodesByChild.value,
        [childId]: existing.map(e =>
          e.id === updated.id ? updated : e
        )
      }

      return updated
    } finally {
      loading.value = false
    }
  }

  /**
   * Get episode statistics
   */
  const getStats = async (episodeId) => {
    const familyStore = useFamilyStore()
    const familyId = familyStore.currentFamilyId
    if (!familyId || !episodeId) return null

    return episodeService.getEpisodeStats({
      episodeId,
      familyId
    })
  }

  /**
   * Update active episode from record creation response
   * Called by records store when a new record is created
   */
  const setActiveEpisodeId = (childId, episodeId) => {
    // If we already have this episode cached, do nothing
    const existing = activeEpisodeByChild.value[childId]
    if (existing?.id === episodeId) return

    // Otherwise, mark that we need to reload
    // The episode data will be loaded when needed
  }

  /**
   * Clear child's episode cache
   */
  const clearChildEpisodes = (childId) => {
    if (episodesByChild.value[childId]) {
      const { [childId]: _removed, ...rest } = episodesByChild.value
      episodesByChild.value = rest
    }
    if (activeEpisodeByChild.value[childId]) {
      const { [childId]: _removed, ...rest } = activeEpisodeByChild.value
      activeEpisodeByChild.value = rest
    }
  }

  /**
   * Reset all state
   */
  const reset = () => {
    episodesByChild.value = {}
    activeEpisodeByChild.value = {}
  }

  return {
    // State
    episodesByChild,
    activeEpisodeByChild,
    loading,

    // Computed
    activeEpisode,
    historyEpisodes,

    // Actions
    loadActiveEpisode,
    loadHistoryEpisodes,
    markRecovered,
    getStats,
    setActiveEpisodeId,
    clearChildEpisodes,
    reset
  }
})
