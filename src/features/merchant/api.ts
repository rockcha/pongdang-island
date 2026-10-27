import { createClient } from '@/lib/client'
import type { Rarity } from '@/lib/game/rarity'
import {readAccountResource} from '@/lib/account-cache'
import {accountCommand} from '@/lib/account-command'
export type MerchantItem = {
  speciesId: string
  name: string
  thumbnailPath: string
  kind: 'fish' | 'trash' | 'decoration'
  rarity: Rarity
  quantity: number
  unitGold: number
  owned: number
}
export type MerchantOrder = {
  id: string
  number: number
  tier: 'small' | 'mixed' | 'special' | 'grand'
  regionName: string | null
  items: MerchantItem[]
  baseGold: number
  rewardGold: number
  completed: boolean
  mine: boolean
  delivery?: { levelProgress?:number|null;level?: number|null; nickname: string; avatarPath: string | null; message: string } | null
}
export type MerchantState = {
  day: string
  serverNow: string
  resetsAt: string
  dailyLimit: number | null
  deliveredToday: number
  orders: MerchantOrder[]
  replayed?: boolean
  receipt?: { orderId: string; gold: number }
}
export const canDeliver = (order: MerchantOrder) =>
  !order.completed && order.items.length>0 && order.items.every((item) => item.owned >= item.quantity)
// Daily-board initialization is idempotent and serialized server-side. This read
// never submits a delivery or spends the caller's inventory.
export async function readMerchant(signal:AbortSignal):Promise<MerchantState> {
  const { data, error } = await createClient().rpc('merchant_state').abortSignal(signal)
  if (error) throw error
  return data
}
export function loadMerchant(refresh:{fresh?:boolean}={}){return readAccountResource('merchant',readMerchant,refresh)}
export async function deliverMerchant(order: string, operation: string, message = '') {
 return accountCommand(async()=>{
  const { data, error } = await createClient().rpc('deliver_merchant_order', {
    p_order_id: order,
    p_operation_id: operation,
    p_message: message,
  })
  if (error) throw error
  return data
 },{resource:'merchant',event:'collectibles-changed',invalidate:['wallet','hall']})
}
export function merchantError(cause: unknown) {
  const message = String((cause as { message?: string })?.message ?? '')
  const errors: Record<string, string> = {
    MERCHANT_MESSAGE_TOO_LONG: '한마디는 80자 이내로 적어주세요.',
    MERCHANT_ORDER_TAKEN: '다른 모험가가 먼저 납품했어요. 다른 주문을 골라주세요.',
    MERCHANT_INSUFFICIENT_ITEMS:
      '보관함의 개체가 부족해요. 어항에 있는 개체는 먼저 보관함으로 옮겨주세요.',
    MERCHANT_ORDER_EXPIRED: '새로운 날의 주문이 도착했어요. 목록을 새로 확인해주세요.',
    MERCHANT_ORDER_NOT_FOUND: '주문을 찾지 못했어요. 목록을 다시 확인해주세요.',
    GOLD_LIMIT: '골드 보유 한도를 넘어요. 골드를 사용한 뒤 다시 시도해주세요.',
    OPERATION_CONFLICT: '이전 납품 요청을 먼저 확인해주세요.',
  }
  return (
    Object.entries(errors).find(([code]) => message.includes(code))?.[1] ??
    '납품 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해주세요.'
  )
}
