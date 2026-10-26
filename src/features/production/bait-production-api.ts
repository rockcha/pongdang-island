import { createClient } from '@/lib/client'
import { getQueryAccount, readAccountResource, resourceChanged } from '@/lib/account-cache'
import {announceBaitReceived} from '@/features/fishing/bait-reward-effect'
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
  receipt?:{action:string;siteId?:string;count:number}
  activeLimit?: number
  activeTotal?: number
  serverNow: string
  gold: number
  fuel: number
  facilities: BaitFacility[]
  sites: BaitFacility[]
}
export type BaitProductionAction = {
  p_action: 'buy' | 'sell' | 'start' | 'claim' | 'discard'
  p_operation_id: string
  p_facility: string
  p_quantity: number
}
export const loadBaitProduction = () => readAccountResource('bait-production', readBaitProduction)
export async function readBaitProduction(signal: AbortSignal) {
  const { data, error } = await createClient().rpc('bait_production_state', {}).abortSignal(signal)
  if (error) throw error
  return data
}
export async function actBaitProduction(args: BaitProductionAction) {
  const scope = getQueryAccount()
  const startedAt=performance.now()
  const { data, error } = await createClient().rpc('bait_production_action', args)
  if (error) throw error
  if(args.p_action==='claim'&&data.receipt?.action==='claim'){
    const site=data.sites.find(site=>site.siteId===args.p_facility)
    if(site)announceBaitReceived('production:'+args.p_operation_id,site.bait_id,data.receipt.count,startedAt)
  }
  window.dispatchEvent(new Event('wallet-changed'))
  resourceChanged('bait-production', 'bait-production-changed', data, scope)
  return data
}
export function baitProductionError(e: unknown) {
  const m = String((e as { message?: string })?.message ?? '')
  return (
    Object.entries({
      PRODUCTION_ACTIVE_LIMIT: '미끼 생산소의 현재 동시 가동 한도에 도달했어요.',
      BAIT_PRODUCTION_ACTIVE_LIMIT: '미끼 생산소의 현재 동시 가동 한도에 도달했어요.',
      INSUFFICIENT_FUEL: '연료가 부족해요.',
      INSUFFICIENT_GOLD: '골드가 부족해요.',
      GOLD_LIMIT: '보유 골드 한도를 초과해 판매할 수 없어요.',
      PRODUCTION_NOT_OWNED: '이미 판매했거나 보유하지 않은 생산소예요.',
      PRODUCTION_NOT_READY: '아직 생산 중이에요.',
      PRODUCTION_EXPIRED: '보관 기간이 지났어요. 생산물을 정리해 주세요.',
      PRODUCTION_BUSY: '이 시설의 생산물을 먼저 수령하거나 정리해 주세요.',
      PRODUCTION_IDLE: '이미 처리된 생산물이에요.',
      BAIT_LIMIT: '미끼 보유 한도에 도달했어요.',
    }).find(([k]) => m.includes(k))?.[1] ??
    '처리 결과를 확인하지 못했어요. 같은 작업을 다시 확인해 주세요.'
  )
}
