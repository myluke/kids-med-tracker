import { z } from 'zod'
import type { ServiceContext } from './types'
import { ServiceError, ErrorCode } from '../errors/service-error'
import { checkFamilyMembership } from '../lib/supabase'

// ============ Zod Schemas ============

export const listEpisodesInputSchema = z.object({
  familyId: z.string().min(1),
  childId: z.string().min(1),
  status: z.enum(['active', 'recovered', 'all']).optional().default('all'),
  limit: z.number().int().min(1).max(50).default(20),
})

export const getActiveEpisodeInputSchema = z.object({
  familyId: z.string().min(1),
  childId: z.string().min(1),
})

export const endEpisodeInputSchema = z.object({
  episodeId: z.string().min(1),
  familyId: z.string().min(1),
})

export const getEpisodeStatsInputSchema = z.object({
  episodeId: z.string().min(1),
  familyId: z.string().min(1),
})

// ============ Types ============

export type ListEpisodesInput = z.infer<typeof listEpisodesInputSchema>
export type GetActiveEpisodeInput = z.infer<typeof getActiveEpisodeInputSchema>
export type EndEpisodeInput = z.infer<typeof endEpisodeInputSchema>
export type GetEpisodeStatsInput = z.infer<typeof getEpisodeStatsInputSchema>

export interface EpisodeDto {
  id: string
  childId: string
  startedAt: string
  endedAt: string | null
  status: 'active' | 'recovered'
  summaryJson: EpisodeSummary | null
  createdAt: string
  updatedAt: string
}

export interface EpisodeSummary {
  durationDays: number
  medCount: number
  maxTemp: number | null
  coughCount: number
  avgCoughPerDay: number
}

// ============ Service Functions ============

/**
 * Get episode list
 */
export async function listEpisodes(
  ctx: ServiceContext,
  input: ListEpisodesInput
): Promise<EpisodeDto[]> {
  const parsed = listEpisodesInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { familyId, childId, status, limit } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  let query = ctx.db
    .from('illness_episodes')
    .select('id, child_id, started_at, ended_at, status, summary_json, created_at, updated_at')
    .eq('family_id', familyId)
    .eq('child_id', childId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch episodes:', error)
    throw ServiceError.dbError('Failed to fetch episodes')
  }

  return (data || []).map(e => ({
    id: e.id,
    childId: e.child_id,
    startedAt: e.started_at,
    endedAt: e.ended_at,
    status: e.status,
    summaryJson: e.summary_json,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }))
}

/**
 * Get active episode for a child (or create one if none exists)
 */
export async function getOrCreateActiveEpisode(
  ctx: ServiceContext,
  input: GetActiveEpisodeInput
): Promise<EpisodeDto | null> {
  const parsed = getActiveEpisodeInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { familyId, childId } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  // Try to find existing active episode
  const { data: existing, error: findError } = await ctx.db
    .from('illness_episodes')
    .select('id, child_id, started_at, ended_at, status, summary_json, created_at, updated_at')
    .eq('family_id', familyId)
    .eq('child_id', childId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (findError && findError.code !== 'PGRST116') {
    console.error('Failed to find active episode:', findError)
    throw ServiceError.dbError('Failed to find active episode')
  }

  if (existing) {
    return {
      id: existing.id,
      childId: existing.child_id,
      startedAt: existing.started_at,
      endedAt: existing.ended_at,
      status: existing.status,
      summaryJson: existing.summary_json,
      createdAt: existing.created_at,
      updatedAt: existing.updated_at,
    }
  }

  return null
}

/**
 * Create a new episode
 */
export async function createEpisode(
  ctx: ServiceContext,
  input: GetActiveEpisodeInput
): Promise<EpisodeDto> {
  const parsed = getActiveEpisodeInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { familyId, childId } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  const { data: episode, error } = await ctx.db
    .from('illness_episodes')
    .insert({
      family_id: familyId,
      child_id: childId,
      created_by_user_id: ctx.user.id,
    })
    .select('id, child_id, started_at, ended_at, status, summary_json, created_at, updated_at')
    .single()

  if (error) {
    console.error('Failed to create episode:', error)
    throw ServiceError.dbError('Failed to create episode')
  }

  return {
    id: episode.id,
    childId: episode.child_id,
    startedAt: episode.started_at,
    endedAt: episode.ended_at,
    status: episode.status,
    summaryJson: episode.summary_json,
    createdAt: episode.created_at,
    updatedAt: episode.updated_at,
  }
}

/**
 * End an episode (mark as recovered)
 */
export async function endEpisode(
  ctx: ServiceContext,
  input: EndEpisodeInput
): Promise<EpisodeDto> {
  const parsed = endEpisodeInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { episodeId, familyId } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  // First get the episode to verify it's active
  const { data: episode, error: findError } = await ctx.db
    .from('illness_episodes')
    .select('id, child_id, started_at, status')
    .eq('id', episodeId)
    .eq('family_id', familyId)
    .single()

  if (findError || !episode) {
    throw new ServiceError(404, ErrorCode.NOT_FOUND, 'Episode not found')
  }

  if (episode.status === 'recovered') {
    throw new ServiceError(400, ErrorCode.BAD_REQUEST, 'Episode already recovered')
  }

  // Calculate summary statistics
  const summary = await calculateEpisodeSummary(ctx, episodeId, episode.started_at)

  // Update episode
  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await ctx.db
    .from('illness_episodes')
    .update({
      status: 'recovered',
      ended_at: now,
      summary_json: summary,
      updated_at: now,
    })
    .eq('id', episodeId)
    .select('id, child_id, started_at, ended_at, status, summary_json, created_at, updated_at')
    .single()

  if (updateError) {
    console.error('Failed to end episode:', updateError)
    throw ServiceError.dbError('Failed to end episode')
  }

  return {
    id: updated.id,
    childId: updated.child_id,
    startedAt: updated.started_at,
    endedAt: updated.ended_at,
    status: updated.status,
    summaryJson: updated.summary_json,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  }
}

/**
 * Get episode statistics
 */
export async function getEpisodeStats(
  ctx: ServiceContext,
  input: GetEpisodeStatsInput
): Promise<EpisodeSummary> {
  const parsed = getEpisodeStatsInputSchema.safeParse(input)
  if (!parsed.success) {
    throw ServiceError.validationError('Invalid input', parsed.error.flatten())
  }
  const { episodeId, familyId } = parsed.data

  const role = await checkFamilyMembership(ctx.db, familyId, ctx.user.id)
  if (!role) {
    throw ServiceError.notFamilyMember()
  }

  // Get episode
  const { data: episode, error: findError } = await ctx.db
    .from('illness_episodes')
    .select('id, started_at, summary_json')
    .eq('id', episodeId)
    .eq('family_id', familyId)
    .single()

  if (findError || !episode) {
    throw new ServiceError(404, ErrorCode.NOT_FOUND, 'Episode not found')
  }

  // Return cached summary if exists
  if (episode.summary_json && Object.keys(episode.summary_json).length > 0) {
    return episode.summary_json as EpisodeSummary
  }

  // Calculate fresh summary
  return calculateEpisodeSummary(ctx, episodeId, episode.started_at)
}

/**
 * Calculate episode summary statistics
 */
async function calculateEpisodeSummary(
  ctx: ServiceContext,
  episodeId: string,
  startedAt: string
): Promise<EpisodeSummary> {
  // Get all records for this episode
  const { data: records, error } = await ctx.db
    .from('records')
    .select('type, time, payload_json')
    .eq('episode_id', episodeId)
    .is('deleted_at', null)

  if (error) {
    console.error('Failed to fetch records for summary:', error)
    return {
      durationDays: 1,
      medCount: 0,
      maxTemp: null,
      coughCount: 0,
      avgCoughPerDay: 0,
    }
  }

  const recordList = records || []

  // Calculate duration
  const startDate = new Date(startedAt)
  const endDate = new Date()
  const durationMs = endDate.getTime() - startDate.getTime()
  const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)))

  // Count meds and find max temp
  let medCount = 0
  let maxTemp: number | null = null
  let coughCount = 0

  for (const record of recordList) {
    if (record.type === 'med') {
      medCount++
      // Check if med record has temp
      const payload = record.payload_json as { temp?: number } | null
      if (payload?.temp) {
        if (maxTemp === null || payload.temp > maxTemp) {
          maxTemp = payload.temp
        }
      }
    } else if (record.type === 'temp') {
      const payload = record.payload_json as { value?: number } | null
      if (payload?.value) {
        if (maxTemp === null || payload.value > maxTemp) {
          maxTemp = payload.value
        }
      }
    } else if (record.type === 'cough') {
      coughCount++
    }
  }

  const avgCoughPerDay = durationDays > 0 ? Math.round((coughCount / durationDays) * 10) / 10 : 0

  return {
    durationDays,
    medCount,
    maxTemp,
    coughCount,
    avgCoughPerDay,
  }
}

/**
 * Internal function to get or create active episode for a child
 * Used by records service when creating a record
 */
export async function ensureActiveEpisode(
  ctx: ServiceContext,
  familyId: string,
  childId: string
): Promise<string> {
  // Try to find existing active episode
  const { data: existing } = await ctx.db
    .from('illness_episodes')
    .select('id')
    .eq('family_id', familyId)
    .eq('child_id', childId)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new episode
  const { data: episode, error } = await ctx.db
    .from('illness_episodes')
    .insert({
      family_id: familyId,
      child_id: childId,
      created_by_user_id: ctx.user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create episode:', error)
    throw ServiceError.dbError('Failed to create episode')
  }

  return episode.id
}
