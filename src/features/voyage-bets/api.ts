import { createClient } from '@/lib/client'
import { accountCommand } from '@/lib/account-command'
export type VoyageCompany = {
  id: string
  name: string
  style: string
  description: string
  banner: string
}
export type VoyageCatch = {
  id: string
  name: string
  kind: string
  rarity: string
  price: number
  thumbnailPath: string
  quantity: number
}
export type VoyageResult = {
  sales: number
  profit: number
  rank: number
  tied: boolean
  regions: { regionId: string; regionName: string; sales: number; catches: VoyageCatch[] }[]
}
export type VoyageProgress = Omit<VoyageResult, 'profit'> & { target: number; achievement: number }
export type VoyagePlan = {
  id: string
  companyId: string
  bait: { id: string; name: string; price: number } | null
  countPerRegion: number | null
  publicRegion: { id: string; name: string } | null
  targetSales: number | null
  totalCost: number | null
  result: VoyageResult | null
  progress: VoyageProgress | null
}
export type VoyageRound = {
  id: string
  opensAt: string
  departsAt: string
  resultsAt: string
  phase: 'scheduled' | 'open' | 'sailing' | 'settling' | 'settled'
  myStake: number
  completedRegions: number
  nextRevealAt: string | null
  refunded: boolean
  myBet: {
    planId: string
    stake: number
    payout: number | null
    paidAt: string | null
    rewardGiftId?: string | null
    rewardClaimedAt?: string | null
  } | null
  plans: VoyagePlan[]
}
export type VoyageState = {
  serverNow: string
  companies: VoyageCompany[]
  rounds: VoyageRound[]
  roundLimit: number
  firstMultiplier: number
  secondMultiplier: number
  pendingPayout: number
  replayed?: boolean
}
export type VoyageBetRequest = {
  p_operation_id: string
  p_plan_id: string
  p_stake: number
}
export async function readVoyageBets(signal: AbortSignal): Promise<VoyageState> {
  const { data, error } = await createClient().rpc('voyage_race_state').abortSignal(signal)
  if (error) throw error
  return data
}
export async function placeVoyageBet(request: VoyageBetRequest): Promise<VoyageState> {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('voyage_race_place', request)
      if (error) throw error
      return data
    },
    { resource: 'voyage-bets', event: 'wallet-changed' },
  )
}
export function voyageError(cause: unknown) {
  const message = String((cause as { message?: string })?.message ?? '')
  const known: Record<string, string> = {
    AUTH_REQUIRED: '로그인 후 참여해 주세요.',
    INVALID_VOYAGE_BET: '참가금은 100골드 단위로 최대 500골드까지 선택해 주세요.',
    VOYAGE_RULES_CHANGED: '이 항차는 이전 규칙으로 진행돼요. 새로운 출항을 선택해 주세요.',
    VOYAGE_NOT_FOUND: '출항 계획을 다시 확인해 주세요.',
    VOYAGE_NOT_OPEN: '아직 접수 시간이 아니에요.',
    VOYAGE_CLOSED: '출항해 접수가 마감됐어요. 다음 회차를 기다려 주세요.',
    VOYAGE_ROUND_LIMIT: '한 회차에 네 회사를 합쳐 500골드까지 참여할 수 있어요.',
    INSUFFICIENT_GOLD: '보유 골드가 부족해요.',
    GOLD_LIMIT: '골드를 사용한 뒤 다시 시도해 주세요. 반환 금액이 보유 한도를 넘어요.',
    OPERATION_CONFLICT: '이전 요청과 내용이 달라요. 처리 결과를 먼저 확인해 주세요.',
  }
  return (
    Object.entries(known).find(([key]) => message.includes(key))?.[1] ??
    '연결을 확인한 뒤 다시 시도해 주세요. 같은 요청은 중복으로 차감되지 않아요.'
  )
}
export const isVoyageRejection = (cause: unknown) =>
  /AUTH_REQUIRED|INVALID_VOYAGE_BET|VOYAGE_NOT_|VOYAGE_CLOSED|VOYAGE_RULES_CHANGED|VOYAGE_ROUND_LIMIT|INSUFFICIENT_GOLD|GOLD_LIMIT|OPERATION_CONFLICT/.test(
    String((cause as { message?: string })?.message ?? ''),
  )
