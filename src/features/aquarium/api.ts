import type { DecorationPlacement, OwnedCollectible } from '@/features/collection/api'
import { createClient } from '@/lib/client'
import type {ThemeTier} from './theme-tiers'
export type AquariumTank = { id: string; name: string; background_id: string; is_default: boolean; created_at: string }
export type AquariumState = { inhabitants:OwnedCollectible[]; storageCount:number; tankCapacity:number; tanks: AquariumTank[]; tankPrice: number; background: string; owned: string[]; catalog: { id: string; name: string; price: number; image_path: string; tier?:ThemeTier }[] }
export type CollectibleStorage={items:OwnedCollectible[];total:number;pageSize:number}
export async function loadCollectibleStorage(offset=0,query='',kind='all',rarity='all',concept='all'){
 const {data,error}=await createClient().rpc('collectible_storage_filtered',{p_offset:offset,p_query:query,p_kind:kind,p_rarity:rarity,p_concept:concept})
 if(error)throw error
 return data
}
export async function moveCollectibles(ids:string[],tankId:string|null){
 const {data,error}=await createClient().rpc('move_collectibles',{p_collectible_ids:ids,p_tank_id:tankId})
 if(error)throw error
 return data
}
export function storageError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 if(message.includes('TANK_FULL'))return '어항당 50개까지 넣을 수 있어요. 선택 수량을 줄이거나 다른 어항을 골라주세요.'
 if(message.includes('COLLECTIBLE_NOT_FOUND')||message.includes('STORAGE_REQUIRED'))return '이미 이동·판매·선물한 개체가 있어요. 목록을 새로고침해주세요.'
 if(message.includes('TANK_NOT_FOUND'))return '어항을 찾지 못했어요. 다른 어항을 골라주세요.'
 return '개체를 옮기지 못했어요. 26번 SQL 적용과 연결을 확인해주세요.'
}
export async function loadAquarium() {
 const {data,error}=await createClient().rpc('aquarium_state')
 if(error)throw error
 return data
}
export async function manageTank(tankId:string, action:'rename'|'equip', value:string) {
 const {data,error}=await createClient().rpc('manage_aquarium_tank',{p_tank_id:tankId,p_action:action,p_value:value})
 if(error)throw error
 return data
}
export function backgroundUrl(path:string) {
 return createClient().storage.from('aquarium-backgrounds').getPublicUrl(path).data.publicUrl+'?v=20261016-minimal'
}
export async function placeCollectible(id:string,tankId:string,x:number,y:number){
 const {data,error}=await createClient().rpc('place_collectible',{p_collectible_id:id,p_tank_id:tankId,p_x:x,p_y:y})
 if(error)throw error
 return data
}
export async function arrangeDecoration(id:string,tankId:string,placement:DecorationPlacement){
 const args={p_collectible_id:id,p_tank_id:tankId,p_x:placement.position_x,p_y:placement.position_y,p_rotation:placement.rotation,p_scale:placement.scale,p_flipped:placement.flipped??false}
 const {data,error}=placement.position_locked===undefined?await createClient().rpc('arrange_collectible',args):await createClient().rpc('arrange_collectible_with_lock',{...args,p_position_locked:placement.position_locked})
 if(error)throw error
 return data
}
