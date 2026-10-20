import type { RankingFriend } from './ranking-friend-action'
import { createClient } from '@/lib/client'
import { BRICK_ENGINE_VERSION, type BrickReplay } from './brick-breaker-replay'
export type BrickRun = {
  id: string
  seed: number
  engine_version: number
  started_at: string
  finished_at: string | null
  score: number
  reward: number
  paid_reward: number
  replay: BrickReplay
}
export type BrickRanks = {
  total: number
  offset: number
  rows: (RankingFriend & {
    id: string
    rank: number
    gold: number
    nickname: string
    mine: boolean
  })[]
}
export async function startBrickRun(operationId: string) {
  const { data, error } = await createClient().rpc('brick_game_start', {
    p_operation_id: operationId,
    p_engine_version: BRICK_ENGINE_VERSION,
  })
  if (error) throw error
  return data
}
export async function settleBrickRun(runId: string, replay: BrickReplay, final: boolean) {
  const { data, error } = await createClient().functions.invoke<BrickRun>('brick-game', {
    body: { runId, replay, action: final ? 'finish' : 'checkpoint' },
  })
  if (error || !data || 'error' in data) throw error ?? new Error('SETTLEMENT_FAILED')
  return data
}
export async function brickLeaderboard(offset = 0) {
  const { data, error } = await createClient().rpc('brick_leaderboard', { p_offset: offset })
  if (error) throw error
  return data
}
export function brickError(cause: unknown) {
  const error = cause as { message?: string; code?: string }
  if (error.message?.includes('AUTH_REQUIRED')) return '로그인 후 실전을 이용해주세요.'
  if (error.message?.includes('ENGINE_VERSION_MISMATCH'))
    return '새 게임 규칙을 준비 중이에요. 잠시 후 다시 시작해주세요.'
  if (error.code === 'PGRST202')
    return '실전 서버 연결을 준비 중이에요. 연습과 모션 테스트를 이용해주세요.'
  return '서버 연결을 확인하고 다시 시도해주세요. 진행 기록은 유지돼요.'
}
