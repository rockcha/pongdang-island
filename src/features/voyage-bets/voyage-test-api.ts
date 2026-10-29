import { createClient } from '@/lib/client'
import type { VoyageState } from './api'
export const voyageTestSteps = [
  { id: 'scheduled', label: '접수 전' },
  { id: 'open', label: '접수 시작' },
  { id: 'sailing', label: '출항' },
  { id: 'one', label: '1시간 후' },
  { id: 'two', label: '2시간 후' },
  { id: 'final', label: '최종 정산' },
] as const
export type VoyageTestPhase = (typeof voyageTestSteps)[number]['id']
export type VoyageTestSample = Record<VoyageTestPhase, VoyageState>
export type VoyageTestBet = { planId: string; stake: number }
export const voyageTestStartingGold = 10000
export async function readVoyageTestSample(signal: AbortSignal): Promise<VoyageTestSample> {
  const { data, error } = await createClient().rpc('voyage_race_test_sample').abortSignal(signal)
  if (error) throw error
  return data
}
/** Pure rehearsal projection. Never calls a trading RPC or publishes wallet events. */
export function voyageTestProjection(
  sample: VoyageTestSample,
  phase: VoyageTestPhase,
  bet: VoyageTestBet | null,
) {
  const source = sample[phase],
    round = source.rounds[0]
  const plan = bet ? round.plans.find((p) => p.id === bet.planId) : undefined
  const valid =
    phase !== 'scheduled' &&
    !!bet &&
    !!plan &&
    Number.isInteger(bet.stake) &&
    bet.stake >= 100 &&
    bet.stake <= source.roundLimit &&
    bet.stake % 100 === 0
  const settled = phase === 'final'
  const payout =
    valid && settled
      ? round.refunded
        ? bet.stake
        : plan.result?.rank === 1
          ? Math.round(bet.stake * source.firstMultiplier)
          : plan.result?.rank === 2
            ? Math.round(bet.stake * source.secondMultiplier)
            : 0
      : null
  const myBet = valid
    ? {
        ...bet,
        payout,
        paidAt: payout !== null ? source.serverNow : null,
        rewardGiftId: payout !== null && payout > 0 ? 'preview' : null,
        rewardClaimedAt: null,
      }
    : null
  return {
    gold: voyageTestStartingGold - (myBet?.stake ?? 0),
    storedGold: payout ?? 0,
    data: { ...source, rounds: [{ ...round, myStake: myBet?.stake ?? 0, myBet }] },
  }
}
