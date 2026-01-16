import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listEpisodes,
  getOrCreateActiveEpisode,
  createEpisode,
  endEpisode,
  getEpisodeStats,
  ensureActiveEpisode
} from '../episodes'
import { ServiceError, ErrorCode } from '../../errors/service-error'
import type { ServiceContext } from '../types'

// Mock checkFamilyMembership
vi.mock('../../lib/supabase', () => ({
  checkFamilyMembership: vi.fn()
}))

import { checkFamilyMembership } from '../../lib/supabase'

describe('episodes service', () => {
  const mockUserId = 'user-123'
  const mockFamilyId = 'family-456'
  const mockChildId = 'child-789'
  const mockEpisodeId = 'episode-001'

  // Mock Supabase client with chainable methods
  const createMockDb = () => {
    const chain: any = {}
    const methods = ['from', 'select', 'insert', 'update', 'eq', 'is', 'order', 'limit', 'single']

    methods.forEach(method => {
      chain[method] = vi.fn(() => chain)
    })

    // Final result
    chain.then = undefined
    chain.data = null
    chain.error = null

    return chain
  }

  const createMockContext = (dbOverrides = {}): ServiceContext => {
    const mockDb = createMockDb()
    Object.assign(mockDb, dbOverrides)

    return {
      db: mockDb as any,
      user: { id: mockUserId, email: 'test@example.com' },
      env: {} as any
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkFamilyMembership).mockResolvedValue('owner')
  })

  describe('listEpisodes', () => {
    it('should validate input and throw on invalid familyId', async () => {
      const ctx = createMockContext()

      await expect(listEpisodes(ctx, {
        familyId: '',
        childId: mockChildId
      })).rejects.toThrow()
    })

    it('should check family membership', async () => {
      vi.mocked(checkFamilyMembership).mockResolvedValue(null)
      const ctx = createMockContext()

      await expect(listEpisodes(ctx, {
        familyId: mockFamilyId,
        childId: mockChildId
      })).rejects.toThrow('Not a family member')
    })

    it('should fetch episodes with default parameters', async () => {
      const mockEpisodes = [
        {
          id: mockEpisodeId,
          child_id: mockChildId,
          started_at: '2024-01-10T00:00:00Z',
          ended_at: null,
          status: 'active',
          summary_json: null,
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-10T00:00:00Z'
        }
      ]

      const mockChain = createMockDb()
      mockChain.limit = vi.fn(() => Promise.resolve({ data: mockEpisodes, error: null }))

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      const result = await listEpisodes(ctx, {
        familyId: mockFamilyId,
        childId: mockChildId
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(mockEpisodeId)
      expect(result[0].childId).toBe(mockChildId)
    })
  })

  describe('getOrCreateActiveEpisode', () => {
    it('should return null when no active episode exists', async () => {
      const mockChain = createMockDb()
      mockChain.single = vi.fn(() => Promise.resolve({
        data: null,
        error: { code: 'PGRST116' } // No rows found
      }))

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      const result = await getOrCreateActiveEpisode(ctx, {
        familyId: mockFamilyId,
        childId: mockChildId
      })

      expect(result).toBeNull()
    })

    it('should return existing active episode', async () => {
      const mockEpisode = {
        id: mockEpisodeId,
        child_id: mockChildId,
        started_at: '2024-01-10T00:00:00Z',
        ended_at: null,
        status: 'active',
        summary_json: null,
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-10T00:00:00Z'
      }

      const mockChain = createMockDb()
      mockChain.single = vi.fn(() => Promise.resolve({ data: mockEpisode, error: null }))

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      const result = await getOrCreateActiveEpisode(ctx, {
        familyId: mockFamilyId,
        childId: mockChildId
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe(mockEpisodeId)
      expect(result?.status).toBe('active')
    })
  })

  describe('createEpisode', () => {
    it('should create a new episode', async () => {
      const mockEpisode = {
        id: mockEpisodeId,
        child_id: mockChildId,
        started_at: '2024-01-10T00:00:00Z',
        ended_at: null,
        status: 'active',
        summary_json: null,
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-10T00:00:00Z'
      }

      const mockChain = createMockDb()
      mockChain.single = vi.fn(() => Promise.resolve({ data: mockEpisode, error: null }))

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      const result = await createEpisode(ctx, {
        familyId: mockFamilyId,
        childId: mockChildId
      })

      expect(result.id).toBe(mockEpisodeId)
      expect(result.status).toBe('active')
    })

    it('should check family membership before creating', async () => {
      vi.mocked(checkFamilyMembership).mockResolvedValue(null)
      const ctx = createMockContext()

      await expect(createEpisode(ctx, {
        familyId: mockFamilyId,
        childId: mockChildId
      })).rejects.toThrow('Not a family member')
    })
  })

  describe('endEpisode', () => {
    it('should throw when episode not found', async () => {
      const mockChain = createMockDb()
      mockChain.single = vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }))

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      await expect(endEpisode(ctx, {
        episodeId: mockEpisodeId,
        familyId: mockFamilyId
      })).rejects.toThrow('Episode not found')
    })

    it('should throw when episode already recovered', async () => {
      const mockEpisode = {
        id: mockEpisodeId,
        child_id: mockChildId,
        started_at: '2024-01-10T00:00:00Z',
        status: 'recovered'
      }

      const mockChain = createMockDb()
      mockChain.single = vi.fn(() => Promise.resolve({ data: mockEpisode, error: null }))

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      await expect(endEpisode(ctx, {
        episodeId: mockEpisodeId,
        familyId: mockFamilyId
      })).rejects.toThrow('Episode already recovered')
    })
  })

  describe('getEpisodeStats', () => {
    it('should return cached summary if exists', async () => {
      const cachedSummary = {
        durationDays: 5,
        medCount: 10,
        maxTemp: 39.0,
        coughCount: 15,
        avgCoughPerDay: 3
      }

      const mockEpisode = {
        id: mockEpisodeId,
        started_at: '2024-01-10T00:00:00Z',
        summary_json: cachedSummary
      }

      const mockChain = createMockDb()
      mockChain.single = vi.fn(() => Promise.resolve({ data: mockEpisode, error: null }))

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      const result = await getEpisodeStats(ctx, {
        episodeId: mockEpisodeId,
        familyId: mockFamilyId
      })

      expect(result).toEqual(cachedSummary)
    })

    it('should throw when episode not found', async () => {
      const mockChain = createMockDb()
      mockChain.single = vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }))

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      await expect(getEpisodeStats(ctx, {
        episodeId: mockEpisodeId,
        familyId: mockFamilyId
      })).rejects.toThrow('Episode not found')
    })
  })

  describe('ensureActiveEpisode', () => {
    it('should return existing episode id if active episode exists', async () => {
      const mockChain = createMockDb()
      mockChain.single = vi.fn(() => Promise.resolve({
        data: { id: mockEpisodeId },
        error: null
      }))

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      const result = await ensureActiveEpisode(ctx, mockFamilyId, mockChildId)

      expect(result).toBe(mockEpisodeId)
    })

    it('should create new episode if no active episode exists', async () => {
      const newEpisodeId = 'new-episode-id'
      let callCount = 0

      const mockChain = createMockDb()
      mockChain.single = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          // First call: no existing episode
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
        }
        // Second call: created episode
        return Promise.resolve({ data: { id: newEpisodeId }, error: null })
      })

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      const result = await ensureActiveEpisode(ctx, mockFamilyId, mockChildId)

      expect(result).toBe(newEpisodeId)
    })
  })

  describe('input validation', () => {
    it('should reject empty familyId', async () => {
      const ctx = createMockContext()

      await expect(listEpisodes(ctx, {
        familyId: '',
        childId: mockChildId
      })).rejects.toThrow()
    })

    it('should reject empty childId', async () => {
      const ctx = createMockContext()

      await expect(listEpisodes(ctx, {
        familyId: mockFamilyId,
        childId: ''
      })).rejects.toThrow()
    })

    it('should use default limit when not specified', async () => {
      const mockEpisodes: any[] = []
      const mockChain = createMockDb()
      let capturedLimit: number | undefined

      mockChain.limit = vi.fn((n: number) => {
        capturedLimit = n
        return Promise.resolve({ data: mockEpisodes, error: null })
      })

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      await listEpisodes(ctx, {
        familyId: mockFamilyId,
        childId: mockChildId
      })

      expect(capturedLimit).toBe(20) // default limit
    })

    it('should respect custom limit', async () => {
      const mockEpisodes: any[] = []
      const mockChain = createMockDb()
      let capturedLimit: number | undefined

      mockChain.limit = vi.fn((n: number) => {
        capturedLimit = n
        return Promise.resolve({ data: mockEpisodes, error: null })
      })

      const ctx: ServiceContext = {
        db: { from: vi.fn(() => mockChain) } as any,
        user: { id: mockUserId, email: 'test@example.com' },
        env: {} as any
      }

      await listEpisodes(ctx, {
        familyId: mockFamilyId,
        childId: mockChildId,
        limit: 50
      })

      expect(capturedLimit).toBe(50)
    })
  })
})
