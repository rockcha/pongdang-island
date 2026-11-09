import { createClient } from '@/lib/client'
import { accountCommand } from '@/lib/account-command'
import { getQueryAccount, publishAccountResource } from '@/lib/account-cache'
import type { GoldState } from '@/features/gold/api'
import type { ShadowLeaderboard } from './shadow-api'
import { BILLIARDS_ENGINE_VERSION, type BilliardsReplay } from './billiards-replay'
export type BilliardsRun = {
  id: string
  engine_version: number
  score: number
  reward: number
  replay: BilliardsReplay
  started_at: string
  finished_at: string | null
  abandoned: boolean
}
export type BilliardsAccountState = {
  serverNow: string
  run: BilliardsRun | null
  wallet: GoldState
}
export async function readBilliards(signal: AbortSignal): Promise<BilliardsAccountState> {
  const { data, error } = await createClient().rpc('billiards_state').abortSignal(signal)
  if (error) throw error
  return data
}
function effects(final = false) {
  const scope = getQueryAccount()
  return {
    resource: 'billiards',
    invalidate: final ? ['billiards-ranking'] : [],
    after: (data: BilliardsAccountState) => {
      publishAccountResource('wallet', data.wallet, scope)
    },
  }
}
export function startBilliards(operationId: string) {
  return accountCommand(async () => {
    const { data, error } = await createClient().rpc('billiards_start', {
      p_operation_id: operationId,
      p_engine_version: BILLIARDS_ENGINE_VERSION,
    })
    if (error) throw error
    return data
  }, effects())
}
export function saveBilliards(runId: string, replay: BilliardsReplay, final: boolean) {
  return accountCommand(async () => {
    const { data, error } = await createClient().functions.invoke<BilliardsAccountState>(
      'billiards-game',
      { body: { runId, replay, final } },
    )
    if (error || !data || 'error' in data) throw error ?? new Error('SETTLEMENT_FAILED')
    return data
  }, effects(final))
}
export async function readBilliardsRanking(
  signal: AbortSignal,
  offset = 0,
): Promise<ShadowLeaderboard> {
  const { data, error } = await createClient()
    .rpc('billiards_leaderboard', { p_offset: offset })
    .abortSignal(signal)
  if (error) throw error
  return data
}
export function billiardsError(cause: unknown) {
  const message = String((cause as { message?: string })?.message ?? '')
  if (message.includes('INSUFFICIENT_GOLD')) return '참가비 10골드가 부족해요.'
  if (message.includes('AUTH_REQUIRED')) return '로그인 후 실전에 참여해주세요.'
  return '처리 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해주세요.'
}
