import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecordsStore } from '../records'
import { useChildrenStore } from '../children'
import { useFamilyStore } from '../family'
import { useEpisodesStore } from '../episodes'

// Mock services
vi.mock('@/services/recordService', () => ({
  getRecords: vi.fn(),
  createRecord: vi.fn(),
  deleteRecord: vi.fn()
}))

vi.mock('@/config/medications', () => ({
  feverMeds: ['布洛芬', '对乙酰氨基酚']
}))

describe('useRecordsStore - episode filtering', () => {
  const mockChildId = 'child-123'
  const mockFamilyId = 'family-456'
  const mockEpisodeId1 = 'episode-1'
  const mockEpisodeId2 = 'episode-2'

  // Mock records with different episodes
  const now = Date.now()
  const mockRecords = [
    // Episode 1 records
    {
      id: 'rec-1',
      episodeId: mockEpisodeId1,
      type: 'temp',
      time: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      value: 38.5
    },
    {
      id: 'rec-2',
      episodeId: mockEpisodeId1,
      type: 'med',
      time: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      drug: '布洛芬',
      dosage: '5ml',
      temp: 39.0
    },
    {
      id: 'rec-3',
      episodeId: mockEpisodeId1,
      type: 'cough',
      time: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      level: 'mild'
    },
    // Episode 2 records
    {
      id: 'rec-4',
      episodeId: mockEpisodeId2,
      type: 'temp',
      time: new Date(now - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      value: 37.5
    },
    {
      id: 'rec-5',
      episodeId: mockEpisodeId2,
      type: 'cough',
      time: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      level: 'severe'
    },
    {
      id: 'rec-6',
      episodeId: mockEpisodeId2,
      type: 'cough',
      time: new Date(now - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      level: 'moderate'
    }
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Setup family store
    const familyStore = useFamilyStore()
    familyStore.families = [{ id: mockFamilyId, name: 'Test Family' }]
    familyStore.currentFamilyId = mockFamilyId

    // Setup children store
    const childrenStore = useChildrenStore()
    childrenStore.children = [{ id: mockChildId, name: 'Test Child' }]
    childrenStore.currentChild = mockChildId

    // Setup episodes store
    const episodesStore = useEpisodesStore()
    episodesStore.activeEpisodeByChild[mockChildId] = {
      id: mockEpisodeId1,
      status: 'active'
    }

    // Setup records store with mock data
    const recordsStore = useRecordsStore()
    recordsStore.recordsByChild[mockChildId] = mockRecords
  })

  describe('getTempData', () => {
    it('should return all temp data when no episodeId', () => {
      const recordsStore = useRecordsStore()
      const result = recordsStore.getTempData(24)

      // Should include temp records and med records with temp
      expect(result.length).toBe(3) // rec-1, rec-2 (med with temp), rec-4
    })

    it('should filter by episodeId when provided', () => {
      const recordsStore = useRecordsStore()

      // Episode 1 should have 2 temp data points
      const result1 = recordsStore.getTempData(24, mockEpisodeId1)
      expect(result1.length).toBe(2) // rec-1 (temp), rec-2 (med with temp)

      // Episode 2 should have 1 temp data point
      const result2 = recordsStore.getTempData(24, mockEpisodeId2)
      expect(result2.length).toBe(1) // rec-4
    })

    it('should return empty array for non-existent episode', () => {
      const recordsStore = useRecordsStore()
      const result = recordsStore.getTempData(24, 'non-existent')
      expect(result.length).toBe(0)
    })
  })

  describe('getCoughData', () => {
    const mockT = (key) => key

    it('should return all cough data when no episodeId', () => {
      const recordsStore = useRecordsStore()
      const result = recordsStore.getCoughData(3, mockT)

      // Today should have all 3 cough records
      const todayCount = result.find(d => d.label === 'common.today')?.count
      expect(todayCount).toBe(3)
    })

    it('should filter by episodeId when provided', () => {
      const recordsStore = useRecordsStore()

      // Episode 1 should have 1 cough record
      const result1 = recordsStore.getCoughData(3, mockT, mockEpisodeId1)
      const todayCount1 = result1.find(d => d.label === 'common.today')?.count
      expect(todayCount1).toBe(1)

      // Episode 2 should have 2 cough records
      const result2 = recordsStore.getCoughData(3, mockT, mockEpisodeId2)
      const todayCount2 = result2.find(d => d.label === 'common.today')?.count
      expect(todayCount2).toBe(2)
    })

    it('should return zero counts for non-existent episode', () => {
      const recordsStore = useRecordsStore()
      const result = recordsStore.getCoughData(3, mockT, 'non-existent')

      result.forEach(day => {
        expect(day.count).toBe(0)
      })
    })
  })

  describe('getRecoveryStats', () => {
    it('should return stats for all records when no episodeId', () => {
      const recordsStore = useRecordsStore()
      const result = recordsStore.getRecoveryStats()

      expect(result.totalMeds).toBe(1) // 1 med record total
      expect(result.totalDays).toBeGreaterThan(0)
    })

    it('should filter by episodeId when provided', () => {
      const recordsStore = useRecordsStore()

      // Episode 1 stats
      const result1 = recordsStore.getRecoveryStats(mockEpisodeId1)
      expect(result1.totalMeds).toBe(1) // 1 med in episode 1

      // Episode 2 stats
      const result2 = recordsStore.getRecoveryStats(mockEpisodeId2)
      expect(result2.totalMeds).toBe(0) // 0 meds in episode 2
    })

    it('should return zero stats for non-existent episode', () => {
      const recordsStore = useRecordsStore()
      const result = recordsStore.getRecoveryStats('non-existent')

      expect(result.totalDays).toBe(0)
      expect(result.totalMeds).toBe(0)
      expect(result.avgCough).toBe(0)
    })
  })
})
