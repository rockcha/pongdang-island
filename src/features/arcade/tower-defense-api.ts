import { createClient } from '@/lib/client'
import { accountCommand } from '@/lib/account-command'
import { getQueryAccount, publishAccountResource } from '@/lib/account-cache'
import type { GoldState } from '@/features/gold/api'
import type { ShadowLeaderboard } from './shadow-api'
import { TOWER_ENGINE_VERSION, type TowerReplay } from './tower-defense-replay'
export type TowerRun = {
  id: string
  seed: number
  engine_version: number
  cleared_stage: number
  reward: number
  replay: TowerReplay
  started_at: string
  achieved_at: string | null
  finished_at: string | null
  abandoned: boolean
}
export type TowerAccountState = {
  serverNow: string
  enabled: boolean
  run: TowerRun | null
  wallet: GoldState
}
export async function readTowerDefense(signal: AbortSignal): Promise<TowerAccountState> {
  const { data, error } = await createClient().rpc('tower_defense_state').abortSignal(signal)
  if (error) throw error
  return data
}
function effects() {
  const scope = getQueryAccount()
  return {
    resource: 'tower-defense',
    invalidate: ['tower-defense-ranking'],
    after: (data: TowerAccountState) => {
      publishAccountResource('wallet', data.wallet, scope)
    },
  }
}
export function startTowerDefense(operationId: string) {
  return accountCommand(async () => {
    const { data, error } = await createClient().rpc('tower_defense_start', {
      p_operation_id: operationId,
      p_engine_version: TOWER_ENGINE_VERSION,
    })
    if (error) throw error
    return data
  }, effects())
}
export function saveTowerDefense(runId: string, replay: TowerReplay, final: boolean) {
  return accountCommand(async () => {
    const { data, error } = await createClient().functions.invoke<TowerAccountState>(
      'tower-defense-game',
      { body: { runId, replay, final } },
    )
    if (error || !data || 'error' in data) throw error ?? new Error('SETTLEMENT_FAILED')
    return data
  }, effects())
}
export async function readTowerRanking(
  signal: AbortSignal,
  offset = 0,
): Promise<ShadowLeaderboard> {
  const { data, error } = await createClient()
    .rpc('tower_defense_leaderboard', { p_offset: offset })
    .abortSignal(signal)
  if (error) throw error
  return data
}
export function towerDefenseError(cause: unknown) {
  const e = cause as { message?: string; code?: string },
    message = e?.message ?? ''
  if (message.includes('INSUFFICIENT_GOLD')) return '참가비 30골드가 부족해요.'
  if (message.includes('AUTH_REQUIRED')) return '로그인 후 실전을 이용해 주세요.'
  if (e?.code === 'PGRST202') return '실전 서버를 준비 중이에요. 연습을 먼저 이용해 주세요.'
  return '처리 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.'
}
