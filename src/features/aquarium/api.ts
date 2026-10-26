import {readAccountResource} from '@/lib/account-cache'
import {accountCommand} from '@/lib/account-command'
import type { DecorationPlacement, OwnedCollectible } from '@/features/collection/api'
import { createClient } from '@/lib/client'
import type {ThemeTier} from './theme-tiers'
export type AquariumTank = { id: string; name: string; background_id: string; is_default: boolean; created_at: string; capacity?:number; nextCapacityExpansion?:{capacity:number;price:number}|null }
export type AquariumState = { inhabitants:OwnedCollectible[]; storageCount:number; tankCapacity:number; nextCapacityExpansion?:{capacity:number;price:number}|null; tanks: AquariumTank[]; tankPrice: number; background: string; owned: string[]; catalog: { id: string; name: string; price: number; image_path: string; tier?:ThemeTier }[] }
export type CollectibleStorage={items:OwnedCollectible[];total:number;pageSize:number}
export async function loadCollectibleStorage(
  offset = 0,
  query = '',
  kind = 'all',
  rarity = 'all',
  concept = 'all',
) {
  return readAccountResource(['storage', offset, query, kind, rarity, concept], async (signal) => {
    const { data, error } = await createClient()
      .rpc('collectible_storage_filtered', {
        p_offset: offset,
        p_query: query,
        p_kind: kind,
        p_rarity: rarity,
        p_concept: concept,
      })
      .abortSignal(signal)
    if (error) throw error
    return data
  })
}
export async function moveCollectibles(ids: string[], tankId: string | null) {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('move_collectibles', {
        p_collectible_ids: ids,
        p_tank_id: tankId,
      })
      if (error) throw error
      return data
    },
    { event: 'collectibles-changed' },
  )
}
export function storageError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 if(message.includes('TANK_FULL'))return '어항의 남은 자리가 부족해요. 수용량을 확장하거나 선택 수량을 줄여주세요.'
 if(message.includes('COLLECTIBLE_NOT_FOUND')||message.includes('STORAGE_REQUIRED'))return '이미 이동·판매·선물한 개체가 있어요. 목록을 새로고침해주세요.'
 if(message.includes('TANK_NOT_FOUND'))return '어항을 찾지 못했어요. 다른 어항을 골라주세요.'
 return '개체를 옮기지 못했어요. 26번 SQL 적용과 연결을 확인해주세요.'
}
export async function loadAquarium() {
  return readAccountResource('aquarium', readAquarium)
}
export async function expandAquariumCapacity(tankId: string, capacity: number, operation: string) {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('expand_aquarium_tank', {
        p_tank_id: tankId,
        p_target_capacity: capacity,
        p_operation_id: operation,
      })
      if (error) throw error
      return data
    },
    { resource: 'aquarium', invalidate: ['wallet'], event: 'aquarium-changed' },
  )
}
export function capacityExpansionError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 if(message.includes('TANK_NOT_FOUND'))return '어항을 찾지 못했어요. 다시 열어 주세요.'
 if(message.includes('AQUARIUM_EXPANSION_CHANGED'))return '확장 방식이 변경됐어요. 새로고침해 주세요.'
 if(message.includes('INSUFFICIENT_GOLD'))return '골드가 부족해요.'
 if(message.includes('AQUARIUM_FULLY_EXPANDED'))return '이미 최대 수용량으로 확장했어요.'
 if(message.includes('CAPACITY_CHANGED'))return '다른 창에서 수용량이 변경됐어요. 현재 단계를 다시 확인해 주세요.'
 if(message.includes('OPERATION_CONFLICT'))return '이전 요청과 정보가 달라요. 어항을 다시 열어 주세요.'
 return '확장 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.'
}
export async function reorderAquariumTanks(ids: string[], expectedIds: string[]) {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('reorder_aquarium_tanks', {
        p_tank_ids: ids,
        p_expected_ids: expectedIds,
      })
      if (error) throw error
      return data
    },
    { resource: 'aquarium', event: 'aquarium-changed' },
  )
}
export function tankOrderError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 if(message.includes('TANK_ORDER_CHANGED'))return '다른 곳에서 어항 목록이 변경됐어요. 창을 닫았다가 다시 열어 순서를 확인해 주세요.'
 if(message.includes('INVALID_TANK_ORDER'))return '어항 목록이 달라졌어요. 창을 닫았다가 다시 열어 주세요.'
 return '순서를 저장하지 못했어요. 같은 순서로 다시 저장해 주세요.'
}
export async function manageTank(tankId: string, action: 'rename' | 'equip', value: string) {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('manage_aquarium_tank', {
        p_tank_id: tankId,
        p_action: action,
        p_value: value,
      })
      if (error) throw error
      return data
    },
    { resource: 'aquarium', event: 'aquarium-changed' },
  )
}
export function backgroundUrl(path:string) {
 if(import.meta.env.DEV&&path.startsWith('/assets/storage-upload/'))return path
 return createClient().storage.from('aquarium-backgrounds').getPublicUrl(path).data.publicUrl+'?v=20261016-minimal'
}
export async function placeCollectible(id: string, tankId: string, x: number, y: number) {
  return accountCommand(async () => {
    const { data, error } = await createClient().rpc('place_collectible', {
      p_collectible_id: id,
      p_tank_id: tankId,
      p_x: x,
      p_y: y,
    })
    if (error) throw error
    return data
  }, {})
}
export async function setCollectibleDisplayLayer(id: string, tankId: string, layer: number | null) {
  return accountCommand(async () => {
    const { data, error } = await createClient().rpc('set_collectible_display_layer', {
      p_collectible_id: id,
      p_tank_id: tankId,
      p_layer: layer,
    })
    if (error) throw error
    return data
  }, {})
}
export async function arrangeDecoration(
  id: string,
  tankId: string,
  placement: DecorationPlacement,
  scaleOnly = false,
) {
  return accountCommand(async () => {
    if (scaleOnly) {
      const { data, error } = await createClient().rpc('resize_aquarium_fish', {
        p_collectible_id: id,
        p_tank_id: tankId,
        p_scale: placement.scale,
      })
      if (error) throw error
      return data
    }
    const args = {
      p_collectible_id: id,
      p_tank_id: tankId,
      p_x: placement.position_x,
      p_y: placement.position_y,
      p_rotation: placement.rotation,
      p_scale: placement.scale,
      p_flipped: placement.flipped ?? false,
    }
    const { data, error } =
      placement.position_locked === undefined
        ? await createClient().rpc('arrange_collectible', args)
        : await createClient().rpc('arrange_collectible_with_lock', {
            ...args,
            p_position_locked: placement.position_locked,
          })
    if (error) throw error
    return data
  }, {})
}

export async function readAquarium(signal: AbortSignal) {
  const { data, error } = await createClient().rpc('aquarium_state').abortSignal(signal)
  if (error) throw error
  return data
}
