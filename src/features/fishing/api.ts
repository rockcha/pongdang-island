import { createClient } from '@/lib/client'
import type { OwnedCollectible, Species } from '@/features/collection/api'
import type { Rarity } from '@/lib/game/rarity'
export type FishingBait = { id:string; name:string; description:string; price:number|null; effect_kind:'fish'|'decoration'; effect_description:string; image_path:string; common_bp:number; rare_bp:number; epic_bp:number; mythic_bp:number; failure_bp:number }
export type FishingAttempt = { operation_id:string; region_id:string; bait_id:string; rarity:Rarity|null; created_at:string;collectible_id?:string|null;species?:Species|null }
export type FishingState = { baits:FishingBait[]; items:OwnedCollectible[] }
export type FishingResult = { attempt:FishingAttempt; replayed:boolean }
export async function loadFishing() {
 const {data,error}=await createClient().rpc('fishing_state')
 if(error)throw error
 return data
}
export async function castFishing(regionId:string,baitId:string,operationId:string) {
 const {data,error}=await createClient().rpc('cast_fishing',{p_region_id:regionId,p_bait_id:baitId,p_operation_id:operationId})
 if(error)throw error
 return data
}
export function fishingError(cause:unknown) {
 const message=cause&&typeof cause==='object'&&'message' in cause?String(cause.message):''
 const entries:Record<string,string>={NO_COLLECTIBLE_FOR_REGION:'이 지역에 해당 등급의 개체가 아직 등록되지 않았어요. 미끼는 소모되지 않았어요.',NO_BAIT:'미끼가 없어요. 먼저 구매해주세요.',NOT_IN_REGION:'현재 지역이 바뀌었어요. 선착장에서 위치를 확인해주세요.',REGION_LOCKED:'이 지역은 잠겨 있어요.',INVALID_BAIT:'미끼를 찾을 수 없어요.'}
 return Object.entries(entries).find(([key])=>message.includes(key))?.[1]??'결과를 확인하지 못했어요. 같은 미끼로 결과 다시 확인을 눌러주세요.'
}
