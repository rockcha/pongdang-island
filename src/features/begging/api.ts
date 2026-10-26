import { createClient } from '@/lib/client'
import { experienceChanged } from '@/features/experience/api'
export type BeggingPerson = { nickname: string; avatarPath: string | null }
export type BeggingDonor = BeggingPerson & { id: string; gold: number; createdAt?: string }
export type BeggingRequest = {
  id: string
  story: string
  goalGold: number
  receivedGold: number
  status: 'active' | 'completed' | 'closed'
  createdAt: string
  closedAt: string | null
  mine: boolean
  owner: BeggingPerson & { id: string | null }
  transferCount: number
  donors: BeggingDonor[]
}
export type BeggingFeed = { items: BeggingRequest[]; hasMore: boolean }
export type BeggingDetail = { request: BeggingRequest; items: BeggingDonor[]; hasMore: boolean }
export type BeggingRecord = {
  id: string
  requestId: string
  story: string
  gold: number
  xp: number
  direction: 'sent' | 'received'
  createdAt: string
  person: BeggingPerson
}
export type BeggingHistory = { items: BeggingRecord[]; hasMore: boolean }
export type BeggingDraft = { operationId: string; story: string; goalGold: number }
export type BeggingPayment = { operationId: string; requestId: string; gold: number }
export type BeggingResult = {
  request: BeggingRequest
  receipt: { id: string; gold: number; xp: number; replayed: boolean }
}
export async function loadBegging(tab: 'active' | 'mine', offset = 0): Promise<BeggingFeed> {
  const { data, error } = await createClient().rpc('begging_state', {
    p_tab: tab,
    p_offset: offset,
  })
  if (error) throw error
  return data
}
export async function loadBeggingDetail(id: string, offset = 0): Promise<BeggingDetail> {
  const { data, error } = await createClient().rpc('begging_detail', { p_id: id, p_offset: offset })
  if (error) throw error
  return data
}
export async function loadBeggingHistory(offset = 0): Promise<BeggingHistory> {
  const { data, error } = await createClient().rpc('begging_history', { p_offset: offset })
  if (error) throw error
  return data
}
export async function createBegging(draft: BeggingDraft): Promise<BeggingRequest> {
  const { data, error } = await createClient().rpc('begging_create', {
    p_operation_id: draft.operationId,
    p_story: draft.story,
    p_goal_gold: draft.goalGold,
  })
  if (error) throw error
  return data
}
export async function giveBegging(payment: BeggingPayment): Promise<BeggingResult> {
  const { data, error } = await createClient().rpc('begging_give', {
    p_id: payment.requestId,
    p_gold: payment.gold,
    p_operation_id: payment.operationId,
  })
  if (error) throw error
  window.dispatchEvent(new Event('wallet-changed'))
  experienceChanged()
  return data
}
export async function closeBegging(id: string): Promise<BeggingRequest> {
  const { data, error } = await createClient().rpc('begging_close', { p_id: id })
  if (error) throw error
  return data
}
export function isBeggingRejection(cause: unknown) {
  return /AUTH_REQUIRED|INVALID_BEGGING|BEGGING_|INSUFFICIENT_GOLD|RECIPIENT_GOLD_LIMIT|OPERATION_CONFLICT/.test(
    String((cause as { message?: string })?.message ?? ''),
  )
}
export function beggingError(cause: unknown) {
  const message = String((cause as { message?: string })?.message ?? '')
  const messages: Record<string, string> = {
    AUTH_REQUIRED: '로그인 후 이용해주세요.',
    BEGGING_ALREADY_ACTIVE: '진행 중인 내 사연이 있어요. 내 사연에서 확인해주세요.',
    INVALID_BEGGING_AMOUNT: '보낼 골드는 100골드 이상 정수로 입력해주세요.',
    INVALID_BEGGING: '사연과 목표 골드를 확인해주세요.',
    BEGGING_NOT_FOUND: '사연을 찾을 수 없어요.',
    BEGGING_SELF_GIVE: '내 사연에는 골드를 보낼 수 없어요.',
    BEGGING_CLOSED: '방금 마감된 사연이에요. 골드는 차감되지 않았어요.',
    INSUFFICIENT_GOLD: '보유 골드가 부족해요.',
    RECIPIENT_GOLD_LIMIT: '받는 사람의 골드 보유 한도를 초과해 보낼 수 없어요.',
    BEGGING_FORBIDDEN: '내 사연만 마감할 수 있어요.',
    OPERATION_CONFLICT: '이전 송금과 내용이 달라요. 송금 기록을 먼저 확인해주세요.',
  }
  return (
    Object.entries(messages).find(([key]) => message.includes(key))?.[1] ??
    '처리 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해주세요.'
  )
}
