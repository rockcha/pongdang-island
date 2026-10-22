import { createClient } from '@/lib/client'
export type ProductionFacility = {
  id: string
  siteId?: string
  ownedCount?: number
  name: string
  description: string
  kind: 'trash' | 'fish'
  price: number
  input_count: number
  output_count: number
  production_minutes: number
  storage_minutes: number
  image_path: string
  enabled: boolean
  owned: boolean
  startedAt: string | null
  completesAt: string | null
  expiresAt: string | null
  runOutput: number | null
}
export type ProductionState = {
  serverNow: string
  gold: number
  fuel: number
  facilities: ProductionFacility[]
  sites?: ProductionFacility[]
  receipt?: {
    action: string
    facility?: string
    siteId?: string
    siteIds?: string[]
    fuel?: number
    count?: number
  }
  replayed?: boolean
}
export type ProductionMaterial = {
  id: string
  name: string
  thumbnail_path: string
  rarity: string
  sell_price: number
  available: number
}
export type ProductionAction = {
  p_action: 'buy' | 'start' | 'claim' | 'discard'
  p_operation_id: string
  p_facility: string
  p_materials?: Record<string, number>
  p_quantity?: number
}
export type ProductionPurchase = { p_facility: string; p_quantity: number; p_operation_id: string }
export function productionSiteKey(site: ProductionFacility) {
  return site.siteId ?? site.id
}
export type ProductionBulkAction = {
  p_action: 'start' | 'claim' | 'discard'
  p_operation_id: string
  p_steps: import('./bulk-plan').BulkStep[]
  p_allow_valuable: boolean
}
export async function loadProduction() {
  const { data, error } = await createClient().rpc('production_state', {})
  if (error) throw error
  return data
}
export async function loadProductionMaterials(id: string) {
  const { data, error } = await createClient().rpc('production_materials', { p_facility: id })
  if (error) throw error
  return data
}
export async function actProduction({ p_quantity, ...args }: ProductionAction) {
  const { data, error } =
    args.p_action === 'buy' && (p_quantity ?? 1) !== 1
      ? await createClient().rpc('production_purchase', {
          p_facility: args.p_facility,
          p_quantity: p_quantity!,
          p_operation_id: args.p_operation_id,
        })
      : await createClient().rpc('production_action', args)
  if (error) throw error
  window.dispatchEvent(new Event('wallet-changed'))
  window.dispatchEvent(new Event('production-changed'))
  if (args.p_action === 'start') window.dispatchEvent(new Event('collectibles-changed'))
  return data
}
export async function actProductionBulk(args: ProductionBulkAction) {
  const { data, error } = await createClient().rpc('production_bulk_action', args)
  if (error) throw error
  window.dispatchEvent(new Event('wallet-changed'))
  window.dispatchEvent(new Event('production-changed'))
  if (args.p_action === 'start') window.dispatchEvent(new Event('collectibles-changed'))
  return data
}
export function productionError(cause: unknown) {
  const text = String((cause as { message?: string })?.message ?? '')
  if (text.includes('INSUFFICIENT_MATERIALS'))
    return '재료가 부족해요. 전체 생산소에 필요한 재료를 준비한 뒤 다시 시도해 주세요.'
  if (text.includes('VALUABLE_MATERIAL_CONFIRM_REQUIRED'))
    return '특급·신화 재료 사용을 확인해 주세요.'
  if (text.includes('PRODUCTION_SITE_REQUIRED'))
    return '같은 종류의 생산소가 여러 곳 있어요. 새로고침 후 가동할 생산소를 다시 골라 주세요.'
  if (text.includes('INVALID_PRODUCTION_QUANTITY')) return '구매 수량은 1~100곳으로 입력해 주세요.'
  const messages: Record<string, string> = {
    INSUFFICIENT_GOLD: '골드가 부족해요.',
    PRODUCTION_ALREADY_OWNED: '이미 구매한 생산소예요.',
    PRODUCTION_NOT_OWNED: '먼저 연료 생산소 상점에서 구매해 주세요.',
    INSUFFICIENT_MATERIALS: '재료가 부족하거나 보관함에서 이동되었어요. 다시 골라주세요.',
    INVALID_MATERIAL_COUNT: '필요한 개수만큼 재료를 담아주세요.',
    INVALID_MATERIALS: '재료를 다시 확인해 주세요.',
    PRODUCTION_BUSY: '진행 중인 생산물을 먼저 수령하거나 정리해 주세요.',
    PRODUCTION_NOT_READY: '아직 생산 중이에요.',
    PRODUCTION_EXPIRED: '보관시간이 지났어요. 생산물을 정리해 주세요.',
    PRODUCTION_NOT_EXPIRED: '아직 보관 중인 생산물이 있어요.',
    PRODUCTION_IDLE: '이미 처리되었어요. 상태를 다시 확인해 주세요.',
    PRODUCTION_UNAVAILABLE: '지금은 이용할 수 없는 시설이에요.',
    FUEL_LIMIT: '보유 연료 한도에 도달했어요.',
    OPERATION_CONFLICT: '이전 요청과 같은 작업으로 결과를 다시 확인해 주세요.',
  }
  return (
    Object.entries(messages).find(([key]) => text.includes(key))?.[1] ??
    '결과를 확인하지 못했어요. 같은 작업을 다시 눌러 확인해 주세요.'
  )
}
