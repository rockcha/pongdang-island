import type { RankingFriend } from './ranking-friend-action'
import { createClient } from '@/lib/client'
import type { LadderBet } from './ladder-model'
export type LadderRanks = {
  total: number
  rows: (RankingFriend & {
    id: string
    rank: number
    gold: number
    nickname: string
    mine: boolean
  })[]
}
export async function loadLadderRanks(offset = 0) {
  const { data, error } = await createClient().rpc('ladder_leaderboard', { p_offset: offset })
  if (error) throw error
  return data
}
export async function playLadder(bet: LadderBet) {
  const { data, error } = await createClient().rpc('ladder_game', {
    p_action: 'play',
    p_operation_id: bet.operation,
    p_mode: bet.mode,
    p_stake: bet.stake,
    p_choice: bet.choice,
  })
  if (error) throw error
  if (!data.run) throw new Error('NO_LADDER_RESULT')
  return data.run
}
export function ladderError(cause: unknown) {
  const message = String((cause as { message?: string })?.message ?? '')
  if (message.includes('INSUFFICIENT_GOLD')) return '베팅할 골드가 부족해요. 금액을 줄여주세요.'
  if (message.includes('GOLD_LIMIT')) return '골드 보유 한도를 넘어요. 금액을 줄여주세요.'
  return '결과를 확인하지 못했어요. 다시 확인하면 같은 판의 결과를 가져와요.'
}
