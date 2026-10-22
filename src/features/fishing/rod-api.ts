import {createClient} from '@/lib/client'
import type {FishingBait} from './api'
export type RodCatalogEntry={id:string;name:string;price:number;region_id:string|null;failure_reduction_bp:number;native_bonus_bp:number;wait_reduction_seconds?:number}
export type RodState={owned:string[];selected:string;catalog:RodCatalogEntry[];baits:FishingBait[]}
export async function loadRods():Promise<RodState>{
 const {data,error}=await createClient().rpc('fishing_rod_state')
 if(error)throw error
 return data
}
export async function equipRod(id:string):Promise<RodState>{
 const {data,error}=await createClient().rpc('equip_fishing_rod',{p_rod_id:id})
 if(error)throw error
 return data
}
export function rodError(cause:unknown){
 const message=cause&&typeof cause==='object'&&'message'in cause?String(cause.message):''
 if(message.includes('ROD_NOT_OWNED'))return '보유한 낚싯대만 장착할 수 있어요. 목록을 다시 불러와주세요.'
 return '낚싯대 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'
}
