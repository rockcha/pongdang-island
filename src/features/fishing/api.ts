import {questProgressChanged} from '@/features/quests/progress-events'
import {experienceChanged} from '@/features/experience/api'
import { createClient } from '@/lib/client'
import type { Species } from '@/features/collection/api'
import type { Rarity } from '@/lib/game/rarity'
import {readBiteConfirmation} from './bite-confirmation-preference'
export type FishingBait = { mechanicsVersion?:number;period?:'day'|'night';target_kinds?:string[];successChanceBp?:number;baseSuccessChanceBp?:number;success_chance_bp?:number|null;fish_only?:boolean;alternating?:boolean;nextRarity?:'common'|'rare';id:string; name:string; description:string; price:number|null; effect_kind:'fish'|'decoration'; effect_description:string; image_path:string; common_bp:number; rare_bp:number; epic_bp:number; mythic_bp:number; failure_bp:number }
export type FishingAttempt = { firstDiscovery?:boolean; operation_id:string; region_id:string; bait_id:string; rarity:Rarity|null; created_at:string;collectible_id?:string|null;species?:Species|null }
export type PreparedBaitProfile={common_bp:number;rare_bp:number;epic_bp:number;mythic_bp:number;effect_kind:string;target_kinds:string[];period?:'day'|'night'|null}
export type PreparedFishing = {confirm_bite?:boolean;fight_started_at?:string|null;server_now?:string;bait_profile?:PreparedBaitProfile|null;operation_id:string;region_id:string;bait_id:string;eligible:boolean;species:Species|null;rarity:Rarity;wait_seconds:number;failure_at:number;failure_reason:'bait'|'escape'|'wave';expires_at:string;finished:boolean;result:FishingResult|null}
export type FishingState = {successChanceBp?:number;prepared?:PreparedFishing|null; baits:FishingBait[];regionId?:string;regionName?:string;mapChanceBp?:number }
export type FishingResult = { attempt:FishingAttempt; replayed:boolean;failure_reason?:string|null }
export async function loadFishing() {
 const {data,error}=await createClient().rpc('fishing_state')
 if(error)throw error
 return data
}
export async function castFishing(regionId:string,baitId:string,operationId:string) {
 const {data,error}=await createClient().rpc('cast_fishing',{p_region_id:regionId,p_bait_id:baitId,p_operation_id:operationId})
 if(error)throw error
 if(typeof window!=='undefined')window.dispatchEvent(new Event('collectibles-changed'))
 questProgressChanged();experienceChanged();return data
}
export function fishingError(cause:unknown) {
 const message=cause&&typeof cause==='object'?[('message' in cause?String(cause.message):''),('code' in cause?String(cause.code):'')].join(' '):''
 const entries:Record<string,string>={ALL_COLLECTIBLES_DISCOVERED:'모든 개체를 발견했어요. 소라의 첫인사는 소모되지 않았어요.','42883':'62번 낚시 SQL을 먼저 적용해주세요.',PGRST202:'62번 낚시 SQL을 먼저 적용해주세요.',FISHING_FLOW_UPDATED:'새 낚시 화면으로 새로고침해주세요.',CAST_NOT_FOUND:'진행 중인 낚시를 찾지 못했어요.',CAST_TOO_EARLY:'결과를 정리하고 있어요. 잠시 뒤 다시 확인해주세요.',NO_COLLECTIBLE_FOR_REGION:'이 지역에 해당 등급의 개체가 아직 등록되지 않았어요. 미끼는 소모되지 않았어요.',NO_BAIT:'미끼가 없어요. 먼저 구매해주세요.',NOT_IN_REGION:'현재 지역이 바뀌었어요. 지도에서 위치를 확인해주세요.',REGION_LOCKED:'이 지역은 잠겨 있어요.',INVALID_BAIT:'미끼를 찾을 수 없어요.'}
 return Object.entries(entries).find(([key])=>message.includes(key))?.[1]??'결과를 확인하지 못했어요. 같은 미끼로 결과 다시 확인을 눌러주세요.'
}

export async function prepareFishing(regionId:string,baitId:string,operationId:string){
 const {data,error}=await createClient().rpc('prepare_fishing',{p_region_id:regionId,p_bait_id:baitId,p_operation_id:operationId,p_confirm_bite:readBiteConfirmation()});if(error)throw error;return data
}
export async function startFishingFight(operationId:string){
 const {data,error}=await createClient().rpc('start_fishing_fight',{p_operation_id:operationId});if(error)throw error;return data
}
export async function finishFishing(operationId:string,won:boolean){
 const {data,error}=await createClient().rpc('finish_fishing',{p_operation_id:operationId,p_won:won});if(error)throw error
 if(typeof window!=='undefined'){window.dispatchEvent(new Event('collectibles-changed'));window.dispatchEvent(new Event('fishing-rods-changed'))}questProgressChanged();experienceChanged();return data
}
