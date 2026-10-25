import {questProgressChanged} from '@/features/quests/progress-events'
import { createClient } from '@/lib/client'
import type { Trade, Wallet } from './wallet'
export type GoldState = Wallet & { testClaimed: boolean; testEnabled: boolean }
export function goldError(cause: unknown): string {
  const message = cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : ''
  if(message.includes('BAIT_PRICE_CHANGED'))return '미끼 구매 가격이 바뀌었어요. 현재 가격을 다시 확인해 주세요.'
  if(message.includes('MAP_ALREADY_OWNED'))return '이미 해금한 해역이에요. 지도 목록을 다시 확인해주세요.'
  if(message.includes('INVALID_MAP'))return '판매 중인 지도를 찾지 못했어요.'
  if(message.includes('STARTER_ROD_NOT_TRADEABLE'))return '기본 지급 낚싯대는 구매하거나 판매할 수 없어요.'
  if(message.includes('ROD_ALREADY_OWNED'))return '이미 보유한 낚싯대예요.'
  if(message.includes('ROD_NOT_OWNED'))return '판매할 낚싯대가 없어요. 목록을 다시 불러와주세요.'
  if(message.includes('INVALID_ROD'))return '낚싯대를 찾지 못했어요. 목록을 다시 불러와주세요.'
  if(message.includes('COLLECTIBLE_NOT_FOUND'))return '이미 판매됐거나 판매할 수 없는 개체예요. 목록을 다시 불러와주세요.'
  if(message.includes('OPERATION_CONFLICT'))return '이전 거래 결과와 요청이 달라요. 이전 거래 수량으로 다시 시도해주세요.'
  if(message.includes('INVENTORY_LIMIT'))return '미끼 보유 한도를 초과해 구매할 수 없어요.'
  if(message.includes('INVALID_QUANTITY'))return '구매 수량은 1~99개로 선택해 주세요.'
  const errors: Record<string,string> = { BAIT_NOT_FOR_SALE: '현재 구매할 수 없는 미끼예요.', INVALID_TANK_NAME: '어항 이름은 공백 없이 1~20자로 입력해주세요.', TANK_NOT_FOUND: '어항을 찾지 못했어요. 다시 불러와주세요.', BACKGROUND_ALREADY_OWNED: '이미 보유한 배경이에요.', BACKGROUND_NOT_OWNED: '먼저 배경을 구매해주세요.', INSUFFICIENT_GOLD: '골드가 부족해요.', INSUFFICIENT_INVENTORY: '판매할 아이템이 없어요.', TEST_CHARGE_ALREADY_CLAIMED: '테스트 골드는 계정당 한 번만 받을 수 있어요.', TEST_CHARGE_DISABLED: '테스트 충전이 종료됐어요.', GOLD_LIMIT: '골드 보유 한도에 도달했어요.' }
  return Object.entries(errors).find(([key]) => message.includes(key))?.[1] ?? '골드 데이터를 확인하지 못했어요. SQL 적용과 연결을 확인해주세요.'
}
export async function loadGold() {
  const { data, error } = await createClient().rpc('get_gold_wallet')
  if (error) throw error
  return data
}
export async function transactGold(action: Trade, operationId: string) {
  if(action.type==='buy'&&action.id.startsWith('map:')){
    const {data,error}=await createClient().rpc('buy_region_map',{p_region_id:action.id.slice(4),p_operation_id:operationId})
    if(error)throw error
    if(typeof window!=='undefined')window.dispatchEvent(new Event('region-maps-changed'))
    return data
  }
  if(action.type!=='charge'&&action.id.startsWith('rod:')){
    const {data,error}=await createClient().rpc('trade_fishing_rod',{p_rod_id:action.id.slice(4),p_action:action.type,p_operation_id:operationId})
    if(error)throw error
    if(typeof window!=='undefined')window.dispatchEvent(new Event('fishing-rods-changed'))
    return data
  }
  if(action.type==='sell'&&action.id.startsWith('collectibles:')){
    const {data,error}=await createClient().rpc('sell_collectibles',{p_collectible_ids:action.id.slice(13).split(','),p_operation_id:operationId})
    if(error)throw error
    return data
  }
  if (action.type === 'buy' && action.id.startsWith('fishing:')) {
    if(action.quantity!==undefined){
      if(action.expectedPrice===undefined)throw new Error('미끼 구매 가격을 다시 확인해 주세요.')
      const {data,error}=await createClient().rpc('buy_fishing_bait_bulk',{p_bait_id:action.id.slice(8),p_quantity:action.quantity,p_operation_id:operationId,p_expected_price:action.expectedPrice})
      if(error)throw error
      return data
    }
    if(action.expectedPrice!==undefined){
      const {data,error}=await createClient().rpc('buy_fishing_bait_at_price',{p_bait_id:action.id.slice(8),p_operation_id:operationId,p_expected_price:action.expectedPrice})
      if(error)throw error
      return data
    }
    const { data, error } = await createClient().rpc('buy_fishing_bait', { p_bait_id: action.id.slice(8), p_operation_id: operationId })
    if (error) throw error
    return data
  }
  if (action.type === 'buy' && action.id === 'aquarium:tank') {
    const { data, error } = await createClient().rpc('buy_aquarium_tank', { p_operation_id: operationId })
    if (error) throw error
    questProgressChanged()
    return data
  }
  if (action.type === 'buy' && action.id.startsWith('background:')) {
    const { data, error } = await createClient().rpc('aquarium_background', { p_id: action.id.slice(11), p_action: 'buy', p_operation_id: operationId })
    if (error) throw error
    questProgressChanged()
    return data
  }
  const { data, error } = await createClient().rpc('trade_gold', { p_operation_id: operationId, p_action: action.type, ...(action.type === 'charge' ? {} : { p_item_id: action.id }) })
  if (error) throw error
  return data
}
