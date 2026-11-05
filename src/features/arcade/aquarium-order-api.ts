import { createClient } from '@/lib/client'
import { accountCommand } from '@/lib/account-command'
import type { CountingRound, CountingState } from './calculation-model'
import type { ShadowLeaderboard } from './shadow-api'
export type OrderRun = {
  id: string
  round: number
  phase: CountingState['phase']
  board: CountingRound
  order: number[]
  score: number
  correct: number
  lives: number
  outcome: CountingState['outcome']
  deadline: string | null
  finishedAt: string | null
  abandoned: boolean
}
export type OrderState = { serverNow: string; run: OrderRun | null }
export type OrderRequest = {
  p_action: 'start' | 'begin' | 'answer' | 'next' | 'leave'
  p_operation_id?: string
  p_run_id?: string
  p_round?: number
  p_order?: number[]
}
export async function readOrderState(signal: AbortSignal): Promise<OrderState> {
  const { data, error } = await createClient().rpc('aquarium_order_state').abortSignal(signal)
  if (error) throw error
  return data
}
export function orderAction(args: OrderRequest) {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('aquarium_order_action', args)
      if (error) throw error
      return data
    },
    {
      resource: 'aquarium-order',
      invalidate:
        args.p_action === 'answer' || args.p_action === 'leave' ? ['aquarium-order-ranking'] : [],
    },
  )
}
export async function readOrderRanking(
  signal: AbortSignal,
  offset = 0,
): Promise<ShadowLeaderboard> {
  const { data, error } = await createClient()
    .rpc('aquarium_order_leaderboard', { p_offset: offset })
    .abortSignal(signal)
  if (error) throw error
  return data
}
