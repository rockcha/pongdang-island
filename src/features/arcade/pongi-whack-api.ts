import { createClient } from '@/lib/client'
import { accountCommand } from '@/lib/account-command'
import {questProgressChanged} from '@/features/quests/progress-events'
import type { WhackHit, WhackTarget } from './pongi-whack-model'
import type { MemoryLeaderboard } from './memory-api'
export type WhackRun = {
  durationMs?: number
  rewardGold?: number
  id: string
  startedAt: string
  targets: WhackTarget[]
  finishedAt: string | null
  abandoned: boolean
  score: number
  mistakes: number
}
export type WhackState = { serverNow: string; gold: number; run: WhackRun | null }
export type WhackAction = {
  p_action: 'state' | 'start' | 'finish' | 'leave'
  p_operation_id?: string
  p_run_id?: string
  p_hits?: WhackHit[]
}
export async function readWhack(signal: AbortSignal) {
  const { data, error } = await createClient()
    .rpc('pongi_whack_action', { p_action: 'state' })
    .abortSignal(signal)
  if (error) throw error
  return data
}
export function actWhack(args: WhackAction) {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('pongi_whack_action', args)
      if (error) throw error
      return data
    },
    {
      resource: 'pongi-whack',
      invalidate: args.p_action === 'finish' ? ['pongi-whack-ranking'] : [],
      event: args.p_action === 'start' || args.p_action === 'finish' ? 'wallet-changed' : undefined,
      after:()=>{if(args.p_action==='start')questProgressChanged()},
    },
  )
}
export async function readWhackRanking(
  signal: AbortSignal,
  offset = 0,
): Promise<MemoryLeaderboard> {
  const { data, error } = await createClient()
    .rpc('pongi_whack_leaderboard', { p_offset: offset })
    .abortSignal(signal)
  if (error) throw error
  return data
}
export function whackError(error: unknown) {
  const e = error as { message?: string; code?: string }
  if (e.code === 'PGRST202' || e.code === '42883')
    return '실전 서버를 준비 중이에요. 무료 연습을 먼저 즐겨주세요.'
  if (e.message?.includes('INSUFFICIENT_GOLD')) return '참가비 10골드가 부족해요.'
  if (e.message?.includes('ACTIVE_RUN')) return '진행 중인 실전이 있어요. 이어하기를 눌러주세요.'
  if (e.message?.includes('RUN_EXPIRED'))
    return '기록 제출 시간이 지났어요. 새 게임을 시작해주세요.'
  if (e.message?.includes('AUTH_REQUIRED')) return '로그인 후 실전에 참여해주세요.'
  return '연결을 확인하고 다시 시도해주세요. 같은 요청으로 다시 확인해요.'
}
