import type { OwnedCollectible } from '@/features/collection/api'
import { createClient } from '@/lib/client'
export type AquariumTank = { id: string; name: string; background_id: string; is_default: boolean; created_at: string }
export type AquariumState = { inhabitants:OwnedCollectible[]; tanks: AquariumTank[]; tankPrice: number; background: string; owned: string[]; catalog: { id: string; name: string; price: number; image_path: string }[] }
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
 return createClient().storage.from('aquarium-backgrounds').getPublicUrl(path).data.publicUrl
}
export async function placeCollectible(id:string,tankId:string,x:number,y:number){
 const {data,error}=await createClient().rpc('place_collectible',{p_collectible_id:id,p_tank_id:tankId,p_x:x,p_y:y})
 if(error)throw error
 return data
}
