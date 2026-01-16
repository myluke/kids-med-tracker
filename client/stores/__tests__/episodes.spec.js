import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEpisodesStore } from '../episodes'
import { useChildrenStore } from '../children'
import { useFamilyStore } from '../family'
import * as episodeService from '@/services/episodeService'

// Mock the episode service
vi.mock('@/services/episodeService', () => ({
  getEpisodes: vi.fn(),
  getActiveEpisode: vi.fn(),
  endEpisode: vi.fn(),
  getEpisodeStats: vi.fn()
}))

describe('useEpisodesStore', () => {
  const mockFamilyId = 'family-123'
  const mockChildId = 'child-456'

  const mockActiveEpisode = {
    id: 'episode-1',
    familyId: mockFamilyId,
    childId: mockChildId,
    status: 'active',
    startedAt: '2024-01-10T00:00:00Z',
    endedAt: null,
    summaryJson: { durationDays: 3, medCount: 5, maxTemp: 38.5 }
  }

  const mockRecoveredEpisode = {
    id: 'episode-2',
    familyId: mockFamilyId,
    childId: mockChildId,
    status: 'recovered',
    startedAt: '2024-01-01T00:00:00Z',
    endedAt: '2024-01-05T00:00:00Z',
    summaryJson: { durationDays: 5, medCount: 10, maxTemp: 39.0 }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Setup family store mock
    const familyStore = useFamilyStore()
    familyStore.families = [{ id: mockFamilyId, name: 'Test Family' }]
    familyStore.currentFamilyId = mockFamilyId

    // Setup children store mock
    const childrenStore = useChildrenStore()
    childrenStore.children = [{ id: mockChildId, name: 'Test Child' }]
    childrenStore.currentChild = mockChildId
  })

  describe('activeEpisode', () => {
    it('should return null when no current child', () => {
      const childrenStore = useChildrenStore()
      childrenStore.currentChild = null

      const episodesStore = useEpisodesStore()
      expect(episodesStore.activeEpisode).toBeNull()
    })

    it('should return active episode for current child', () => {
      const episodesStore = useEpisodesStore()
      episodesStore.activeEpisodeByChild[mockChildId] = mockActiveEpisode

      expect(episodesStore.activeEpisode).toEqual(mockActiveEpisode)
    })
  })

  describe('historyEpisodes', () => {
    it('should return empty array when no current child', () => {
      const childrenStore = useChildrenStore()
      childrenStore.currentChild = null

      const episodesStore = useEpisodesStore()
      expect(episodesStore.historyEpisodes).toEqual([])
    })

    it('should filter only recovered episodes', () => {
      const episodesStore = useEpisodesStore()
      episodesStore.episodesByChild[mockChildId] = [
        mockActiveEpisode,
        mockRecoveredEpisode
      ]

      const history = episodesStore.historyEpisodes
      expect(history).toHaveLength(1)
      expect(history[0].status).toBe('recovered')
    })

    it('should sort by endedAt descending', () => {
      const older = {
        ...mockRecoveredEpisode,
        id: 'episode-old',
        endedAt: '2024-01-01T00:00:00Z'
      }
      const newer = {
        ...mockRecoveredEpisode,
        id: 'episode-new',
        endedAt: '2024-01-10T00:00:00Z'
      }

      const episodesStore = useEpisodesStore()
      episodesStore.episodesByChild[mockChildId] = [older, newer]

      const history = episodesStore.historyEpisodes
      expect(history[0].id).toBe('episode-new')
      expect(history[1].id).toBe('episode-old')
    })
  })

  describe('loadActiveEpisode', () => {
    it('should load and cache active episode', async () => {
      vi.mocked(episodeService.getActiveEpisode).mockResolvedValue(mockActiveEpisode)

      const episodesStore = useEpisodesStore()
      const result = await episodesStore.loadActiveEpisode(mockChildId)

      expect(episodeService.getActiveEpisode).toHaveBeenCalledWith({
        familyId: mockFamilyId,
        childId: mockChildId
      })
      expect(result).toEqual(mockActiveEpisode)
      expect(episodesStore.activeEpisodeByChild[mockChildId]).toEqual(mockActiveEpisode)
    })

    it('should return null when no familyId', async () => {
      const familyStore = useFamilyStore()
      familyStore.currentFamilyId = null

      const episodesStore = useEpisodesStore()
      const result = await episodesStore.loadActiveEpisode(mockChildId)

      expect(result).toBeNull()
      expect(episodeService.getActiveEpisode).not.toHaveBeenCalled()
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise
      vi.mocked(episodeService.getActiveEpisode).mockReturnValue(
        new Promise(resolve => { resolvePromise = resolve })
      )

      const episodesStore = useEpisodesStore()
      const promise = episodesStore.loadActiveEpisode(mockChildId)

      expect(episodesStore.loading).toBe(true)

      resolvePromise(mockActiveEpisode)
      await promise

      expect(episodesStore.loading).toBe(false)
    })
  })

  describe('loadHistoryEpisodes', () => {
    it('should load all episodes and update caches', async () => {
      const episodes = [mockActiveEpisode, mockRecoveredEpisode]
      vi.mocked(episodeService.getEpisodes).mockResolvedValue(episodes)

      const episodesStore = useEpisodesStore()
      await episodesStore.loadHistoryEpisodes(mockChildId)

      expect(episodeService.getEpisodes).toHaveBeenCalledWith({
        familyId: mockFamilyId,
        childId: mockChildId,
        status: 'all',
        limit: 20
      })
      expect(episodesStore.episodesByChild[mockChildId]).toEqual(episodes)
      expect(episodesStore.activeEpisodeByChild[mockChildId]).toEqual(mockActiveEpisode)
    })

    it('should respect custom limit parameter', async () => {
      vi.mocked(episodeService.getEpisodes).mockResolvedValue([])

      const episodesStore = useEpisodesStore()
      await episodesStore.loadHistoryEpisodes(mockChildId, 50)

      expect(episodeService.getEpisodes).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      )
    })
  })

  describe('markRecovered', () => {
    it('should end episode and update caches', async () => {
      const recoveredEpisode = {
        ...mockActiveEpisode,
        status: 'recovered',
        endedAt: '2024-01-15T00:00:00Z'
      }
      vi.mocked(episodeService.endEpisode).mockResolvedValue(recoveredEpisode)

      const episodesStore = useEpisodesStore()
      episodesStore.activeEpisodeByChild[mockChildId] = mockActiveEpisode
      episodesStore.episodesByChild[mockChildId] = [mockActiveEpisode]

      const result = await episodesStore.markRecovered()

      expect(episodeService.endEpisode).toHaveBeenCalledWith({
        episodeId: mockActiveEpisode.id,
        familyId: mockFamilyId
      })
      expect(result.status).toBe('recovered')
      expect(episodesStore.activeEpisodeByChild[mockChildId]).toBeNull()
    })

    it('should throw when no active episode', async () => {
      const episodesStore = useEpisodesStore()
      episodesStore.activeEpisodeByChild[mockChildId] = null

      await expect(episodesStore.markRecovered()).rejects.toThrow(
        'No active episode to mark as recovered'
      )
    })
  })

  describe('getStats', () => {
    it('should fetch episode statistics', async () => {
      const mockStats = {
        durationDays: 5,
        medCount: 12,
        maxTemp: 39.2,
        avgCough: 3.5
      }
      vi.mocked(episodeService.getEpisodeStats).mockResolvedValue(mockStats)

      const episodesStore = useEpisodesStore()
      const result = await episodesStore.getStats('episode-1')

      expect(episodeService.getEpisodeStats).toHaveBeenCalledWith({
        episodeId: 'episode-1',
        familyId: mockFamilyId
      })
      expect(result).toEqual(mockStats)
    })

    it('should return null when no familyId', async () => {
      const familyStore = useFamilyStore()
      familyStore.currentFamilyId = null

      const episodesStore = useEpisodesStore()
      const result = await episodesStore.getStats('episode-1')

      expect(result).toBeNull()
    })
  })

  describe('reset', () => {
    it('should clear all state', () => {
      const episodesStore = useEpisodesStore()
      episodesStore.episodesByChild[mockChildId] = [mockActiveEpisode]
      episodesStore.activeEpisodeByChild[mockChildId] = mockActiveEpisode

      episodesStore.reset()

      expect(episodesStore.episodesByChild).toEqual({})
      expect(episodesStore.activeEpisodeByChild).toEqual({})
    })
  })

  describe('clearChildEpisodes', () => {
    it('should clear specific child episodes', () => {
      const anotherChildId = 'child-789'
      const episodesStore = useEpisodesStore()

      episodesStore.episodesByChild[mockChildId] = [mockActiveEpisode]
      episodesStore.episodesByChild[anotherChildId] = [mockRecoveredEpisode]
      episodesStore.activeEpisodeByChild[mockChildId] = mockActiveEpisode
      episodesStore.activeEpisodeByChild[anotherChildId] = null

      episodesStore.clearChildEpisodes(mockChildId)

      expect(episodesStore.episodesByChild[mockChildId]).toBeUndefined()
      expect(episodesStore.episodesByChild[anotherChildId]).toBeDefined()
      expect(episodesStore.activeEpisodeByChild[mockChildId]).toBeUndefined()
    })
  })
})
