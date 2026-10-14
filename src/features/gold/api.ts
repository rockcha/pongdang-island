import { createClient } from '@/lib/client'
import type { Trade, Wallet } from './wallet'
export type GoldState = Wallet & { testClaimed: boolean; testEnabled: boolean }
export function goldError(cause: unknown): string {
  const message = cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : ''
  if(message.includes('COLLECTIBLE_NOT_FOUND'))return '이미 판매됐거나 판매할 수 없는 개체예요. 목록을 다시 불러와주세요.'
  if(message.includes('OPERATION_CONFLICT'))return '이전 거래 결과와 요청이 달라요. 이전 판매 수량으로 다시 시도해주세요.'
  const errors: Record<string,string> = { BAIT_NOT_FOR_SALE: '이 미끼는 상점에서 판매하지 않는 획득 전용 아이템이에요.', INVALID_TANK_NAME: '어항 이름은 공백 없이 1~20자로 입력해주세요.', TANK_NOT_FOUND: '어항을 찾지 못했어요. 다시 불러와주세요.', BACKGROUND_ALREADY_OWNED: '이미 보유한 배경이에요.', BACKGROUND_NOT_OWNED: '먼저 배경을 구매해주세요.', INSUFFICIENT_GOLD: '골드가 부족해요.', INSUFFICIENT_INVENTORY: '판매할 아이템이 없어요.', TEST_CHARGE_ALREADY_CLAIMED: '테스트 골드는 계정당 한 번만 받을 수 있어요.', TEST_CHARGE_DISABLED: '테스트 충전이 종료됐어요.', GOLD_LIMIT: '골드 보유 한도에 도달했어요.' }
  return Object.entries(errors).find(([key]) => message.includes(key))?.[1] ?? '골드 데이터를 확인하지 못했어요. SQL 적용과 연결을 확인해주세요.'
}
export async function loadGold() {
  const { data, error } = await createClient().rpc('get_gold_wallet')
  if (error) throw error
  return data
}
export async function transactGold(action: Trade, operationId: string) {
  if(action.type==='sell'&&action.id.startsWith('collectibles:')){
    const {data,error}=await createClient().rpc('sell_collectibles',{p_collectible_ids:action.id.slice(13).split(','),p_operation_id:operationId})
    if(error)throw error
    return data
  }
  if (action.type === 'buy' && action.id.startsWith('fishing:')) {
    const { data, error } = await createClient().rpc('buy_fishing_bait', { p_bait_id: action.id.slice(8), p_operation_id: operationId })
    if (error) throw error
    return data
  }
  if (action.type === 'buy' && action.id === 'aquarium:tank') {
    const { data, error } = await createClient().rpc('buy_aquarium_tank', { p_operation_id: operationId })
    if (error) throw error
    return data
  }
  if (action.type === 'buy' && action.id.startsWith('background:')) {
    const { data, error } = await createClient().rpc('aquarium_background', { p_id: action.id.slice(11), p_action: 'buy', p_operation_id: operationId })
    if (error) throw error
    return data
  }
  const { data, error } = await createClient().rpc('trade_gold', { p_operation_id: operationId, p_action: action.type, ...(action.type === 'charge' ? {} : { p_item_id: action.id }) })
  if (error) throw error
  return data
}
