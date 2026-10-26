import type { RankingFriend } from './ranking-friend-action'
import { questProgressChanged } from '@/features/quests/progress-events'
import { createClient } from '@/lib/client'

export type ShadowRound = {
  id: string
  number: number
  imagePath: string
  options: { id: string; name: string }[]
  deadline: string
  answered: boolean
  correct: boolean | null
  timedOut: boolean | null
  answerName: string | null
}
export type ShadowRun = {
  id: string
  score: number
  totalQuestions?: number | null
  lives: number
  finished: boolean
  round: ShadowRound
}
export type ShadowState = { serverNow: string; run: ShadowRun | null }
export type ShadowLeaderboard = {
  rows: (RankingFriend & {
    rank: number
    id: string
    nickname: string
    score: number
    finishedAt: string
    mine: boolean
    rewardGold?: number
  })[]
  total: number
  offset: number
  pageSize: number
  weekStart?: string
  weekEnd?: string
  rewards?: number[]
}
export type ShadowAction = {
  p_action: 'state' | 'start' | 'answer' | 'next'
  p_operation_id?: string
  p_run_id?: string
  p_round_id?: string
  p_choice_id?: string
}
export async function shadowAction(args: ShadowAction): Promise<ShadowState> {
  const { data, error } = await createClient().rpc('shadow_game', args)
  if (error) throw error
  if (args.p_action === 'start') questProgressChanged()
  return data
}
export async function shadowLeaderboard(offset = 0): Promise<ShadowLeaderboard> {
  const { data, error } = await createClient().rpc('shadow_leaderboard', { p_offset: offset })
  if (error) throw error
  return data
}
export function shadowError(cause: unknown) {
  const error = cause as { message?: string; code?: string }
  if (error.code === 'PGRST202' || error.code === '42883')
    return '게임 서버 설정이 아직 적용되지 않았어요. 관리자에게 알려주세요.'
  if (error.message?.includes('INSUFFICIENT_GOLD')) return '참가비 10골드가 부족해요.'
  if (error.message?.includes('SHADOW_POOL_UNAVAILABLE'))
    return '출제할 개체가 부족해요. 잠시 후 다시 시도해주세요.'
  return '연결을 확인하고 다시 시도해주세요. 진행 중인 게임은 그대로 유지돼요.'
}
