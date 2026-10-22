import { createClient } from '@/lib/client'
import type { Rarity } from '@/lib/game/rarity'
export type CollectibleKind = 'fish'|'trash'|'decoration'|'map'
export type MovementType='swim'|'pulse'|'crawl'|'fixed'
export type Species = {idle_animated?:boolean;facing_direction?:'left'|'right'|'front'|null;movement_type?:MovementType;flip_with_direction?:boolean;travel_direction?:'both'|'left'|'right';is_native?:boolean;native_region_id?:string|null;id:string;kind:CollectibleKind;name:string;description:string;swim_y_min:number|null;swim_y_max:number|null;speed:number;size:number;rarity:Rarity;sprite_sheet_path:string|null;thumbnail_path:string;sell_price:number}
export type DecorationPlacement = {position_x:number;position_y:number;rotation:number;scale:number;flipped?:boolean;position_locked?:boolean}
export type OwnedCollectible = {id:string;species_id:string;tank_id:string|null;map_region_id?:string|null;animation_seed:number;position_x:number|null;position_y:number|null;rotation?:number;scale?:number;flipped?:boolean;position_locked?:boolean;editing?:boolean;interaction_locked?:boolean;acquired_at:string;species:Species}
export type CatalogEntry = Species & {discovered:boolean;habitats:{id:string;name:string}[]}
export type CollectionState = {items:OwnedCollectible[];catalog:CatalogEntry[]}
export const kindLabels:Record<CollectibleKind,string>={fish:'물고기',trash:'쓰레기',decoration:'장식물',map:'지도'}
const refreshedCloudArt=new Set(['map/routes/map-cloudferry_thumbnail.png','equipment/rods/cloudferry/thumbnail.png'])
export function collectibleUrl(path:string){
  if(/^https?:\/\//i.test(path))return path
 // The isolated development lab loads public artwork without initializing account auth.
 if(import.meta.env.DEV&&typeof window!=='undefined'&&window.location.pathname==='/bait-lab')return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/collectibles/${path}`
 const url=createClient().storage.from('collectibles').getPublicUrl(path).data.publicUrl
 const revision=/^fish\/epic\/lunea-mirrorscale_(sprite|thumbnail)\.png$/.test(path)?'mirrorscale-lavender-v2':/^fish\/epic\/starpattern-manta_(sprite|thumbnail)\.png$/.test(path)?'starlight-20261019':path==='fish/mythic/god-devouring-leviathan_sprite.png'?'leviathan-padding-2':refreshedCloudArt.has(path)?'totoro-2':null
 return revision?`${url}${url.includes('?')?'&':'?'}v=${revision}`:url
}
export async function loadCollection(){const {data,error}=await createClient().rpc('collection_state');if(error)throw error;return data}
