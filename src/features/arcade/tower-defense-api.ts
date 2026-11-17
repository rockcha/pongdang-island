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
export const TOWER_SAVE_TIMEOUT_MS = 15_000
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
export function assertTowerSaveResponse(
  data: TowerAccountState,
  runId: string,
  replay: TowerReplay,
  final: boolean,
  clearedStage: number,
) {
  const saved = data.run
  if (
    !saved ||
    saved.id !== runId ||
    saved.replay?.version !== replay.version ||
    saved.replay.ticks !== replay.ticks ||
    saved.replay.commands?.length !== replay.commands.length ||
    replay.commands.some((command, index) => {
      const incoming = saved.replay.commands[index]
      return (
        !incoming ||
        Object.keys(command).length !== Object.keys(incoming).length ||
        Object.entries(command).some(
          ([key, value]) => (incoming as unknown as Record<string, unknown>)[key] !== value,
        )
      )
    }) ||
    !Number.isInteger(saved.cleared_stage) ||
    saved.cleared_stage < clearedStage ||
    (final && !saved.finished_at) ||
    (!final && !!saved.finished_at)
  )
    throw new Error('SETTLEMENT_MISMATCH')
}
export function saveTowerDefense(
  runId: string,
  replay: TowerReplay,
  final: boolean,
  clearedStage = 0,
) {
  return accountCommand(async () => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      // Bound auth waits and response parsing too. A late response must never publish state.
      const { data, error } = await Promise.race([
        createClient().functions.invoke<TowerAccountState>('tower-defense-game', {
          body: { runId, replay, final },
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error('SETTLEMENT_TIMEOUT'))
            controller.abort()
          }, TOWER_SAVE_TIMEOUT_MS)
        }),
      ])
      if (error || !data || 'error' in data) throw error ?? new Error('SETTLEMENT_FAILED')
      assertTowerSaveResponse(data, runId, replay, final, clearedStage)
      return data
    } finally {
      clearTimeout(timer)
    }
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
  if (message.includes('SETTLEMENT_MISMATCH'))
    return '저장된 진행 기록이 일치하지 않아요. 저장 결과를 다시 확인해 주세요.'
  if (message.includes('SETTLEMENT_TIMEOUT'))
    return '저장 확인 시간이 초과됐어요. 같은 요청으로 저장 결과를 다시 확인해 주세요.'
  if (e?.code === 'PGRST202') return '실전 서버를 준비 중이에요. 연습을 먼저 이용해 주세요.'
  return '처리 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.'
}
