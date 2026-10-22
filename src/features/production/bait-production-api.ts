import { createClient } from '@/lib/client'
export type BaitFacility = {
  id: string
  name: string
  description: string
  bait_id: string
  baitName: string
  image_path: string
  price: number
  fuel_cost: number
  output_count: number
  production_minutes: number
  storage_minutes: number
  ownedCount?: number
  siteId?: string
  startedAt: string | null
  completesAt: string | null
  expiresAt: string | null
  runOutput: number | null
}
export type BaitProductionState = {
  activeTotal?: number
  serverNow: string
  gold: number
  fuel: number
  facilities: BaitFacility[]
  sites: BaitFacility[]
}
export type BaitProductionAction = {
  p_action: 'buy' | 'start' | 'claim' | 'discard'
  p_operation_id: string
  p_facility: string
  p_quantity: number
}
export async function loadBaitProduction() {
  const { data, error } = await createClient().rpc('bait_production_state', {})
  if (error) throw error
  return data
}
export async function actBaitProduction(args: BaitProductionAction) {
  const { data, error } = await createClient().rpc('bait_production_action', args)
  if (error) throw error
  window.dispatchEvent(new Event('wallet-changed'))
  window.dispatchEvent(new Event('bait-production-changed'))
  return data
}
export function baitProductionError(e: unknown) {
  const m = String((e as { message?: string })?.message ?? '')
  return (
    Object.entries({
      PRODUCTION_ACTIVE_LIMIT: '연료·미끼 생산소를 합쳐 동시에 4곳까지 가동할 수 있어요.',
      BAIT_PRODUCTION_ACTIVE_LIMIT: '동시에 가동할 수 있는 연료·미끼 생산소는 합쳐 4곳이에요.',
      INSUFFICIENT_FUEL: '연료가 부족해요.',
      INSUFFICIENT_GOLD: '골드가 부족해요.',
      PRODUCTION_NOT_READY: '아직 생산 중이에요.',
      PRODUCTION_EXPIRED: '보관 기간이 지났어요. 생산물을 정리해 주세요.',
      PRODUCTION_BUSY: '이 시설의 생산물을 먼저 수령하거나 정리해 주세요.',
      PRODUCTION_IDLE: '이미 처리된 생산물이에요.',
      BAIT_LIMIT: '미끼 보유 한도에 도달했어요.',
    }).find(([k]) => m.includes(k))?.[1] ??
    '처리 결과를 확인하지 못했어요. 같은 작업을 다시 확인해 주세요.'
  )
}
