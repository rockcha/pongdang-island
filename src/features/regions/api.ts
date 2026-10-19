import { createClient } from '@/lib/client'
import type { Rarity } from '@/lib/game/rarity'
export type Region = { id:string; name:string; description:string; rarity?:Rarity; map_image_path?:string|null; sort_order:number; image_path:string; requires_map_fragment:boolean; unlocked:boolean; hasFragment:boolean }
export type RegionMap = { canTestLocks:boolean; currentRegion:string; regions:Region[] }
export async function loadRegionMap() {
 const {data,error}=await createClient().rpc('region_map')
 if(error)throw error
 return data
}
export async function travelRegion(regionId:string) {
 const {data,error}=await createClient().rpc('travel_region',{p_region_id:regionId})
 if(error)throw error
 return data
}
export function regionImageUrl(path:string) { if(path.startsWith('/siren/'))return path;return createClient().storage.from('regions').getPublicUrl(path).data.publicUrl }

export async function setRegionTestLock(regionId:string, locked:boolean) {
 const {data,error}=await createClient().rpc('set_region_test_lock',{p_region_id:regionId,p_locked:locked})
 if(error)throw error
 return data
}
