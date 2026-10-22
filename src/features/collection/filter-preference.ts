import {regionIcons} from '@/features/regions/region-icons'
import type {Rarity} from '@/lib/game/rarity'

export type CollectionFilters={
 tab:'all'|'fish'|'trash'|'decoration'
 rarity:'all'|Rarity
 habitat:string
}
const key=(userId:string)=>`pongdang:fishing-collection-filters:v1:${userId}`

export function readCollectionFilters(userId?:string,initialRegion='all'):CollectionFilters{
 const fallback:CollectionFilters={tab:'all',rarity:'all',habitat:initialRegion}
 if(!userId)return fallback
 try{
  const saved=JSON.parse(localStorage.getItem(key(userId))??'null')
  if(!saved||typeof saved!=='object'||Array.isArray(saved))return fallback
  return {
   tab:['all','fish','trash','decoration'].includes(saved.tab)?saved.tab:fallback.tab,
   rarity:['all','common','rare','epic','mythic'].includes(saved.rarity)?saved.rarity:fallback.rarity,
   habitat:saved.habitat==='all'||typeof saved.habitat==='string'&&Object.hasOwn(regionIcons,saved.habitat)?saved.habitat:fallback.habitat,
  }
 }catch{return fallback}
}

export function saveCollectionFilters(userId:string,filters:CollectionFilters){
 try{localStorage.setItem(key(userId),JSON.stringify(filters))}catch{/* Filters still work when storage is unavailable. */}
}
