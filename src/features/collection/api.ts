import { createClient } from '@/lib/client'
import type { Rarity } from '@/lib/game/rarity'
export type CollectibleKind = 'fish'|'trash'|'structure'|'map'
export type Species = {id:string;kind:CollectibleKind;name:string;description:string;swim_y_min:number|null;swim_y_max:number|null;speed:number;size:number;rarity:Rarity;sprite_sheet_path:string|null;thumbnail_path:string;sell_price:number}
export type OwnedCollectible = {id:string;species_id:string;tank_id:string|null;map_region_id?:string|null;animation_seed:number;position_x:number|null;position_y:number|null;acquired_at:string;species:Species}
export type CatalogEntry = Species & {discovered:boolean;habitats:{id:string;name:string}[]}
export type CollectionState = {items:OwnedCollectible[];catalog:CatalogEntry[]}
export const kindLabels:Record<CollectibleKind,string>={fish:'물고기',trash:'쓰레기',structure:'구조물',map:'지도'}
export function collectibleUrl(path:string){return createClient().storage.from('collectibles').getPublicUrl(path).data.publicUrl}
export async function loadCollection(){const {data,error}=await createClient().rpc('collection_state');if(error)throw error;return data}
