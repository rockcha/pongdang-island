import type { OwnedCollectible, Species } from '@/features/collection/api'
import {rarities} from '@/lib/game/rarity'
export function compareStoredSpecies(a:Species,b:Species){
 return (rarities[a.rarity]?.rank??0)-(rarities[b.rarity]?.rank??0)||a.sell_price-b.sell_price||a.name.localeCompare(b.name,'ko')
}
export type CollectibleGroup={species:Species;items:OwnedCollectible[];sellable:OwnedCollectible[]}
export function groupCollectibles(items:OwnedCollectible[]):CollectibleGroup[]{
 const groups=new Map<string,CollectibleGroup>()
 for(const item of items){
  let group=groups.get(item.species_id)
  if(!group){group={species:item.species,items:[],sellable:[]};groups.set(item.species_id,group)}
  group.items.push(item)
  if(!item.id.startsWith('test-')&&(item.species.kind!=='map'&&item.species.kind!=='relic')&&item.species.sell_price>0)group.sellable.push(item)
 }
 return [...groups.values()].sort((a,b)=>a.species.name.localeCompare(b.species.name,'ko'))
}
