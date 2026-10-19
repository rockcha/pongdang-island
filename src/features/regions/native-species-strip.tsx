import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import type { CatalogEntry } from '@/features/collection/api'
import { rarities } from '@/lib/game/rarity'
import { regionIcons } from './region-icons'
import './native-species-strip.css'

export function NativeSpeciesStrip({items,regionId,regionName}:{items:CatalogEntry[];regionId:string;regionName:string}){
 const natives=[...items].sort((a,b)=>rarities[a.rarity].rank-rarities[b.rarity].rank)
 return <section aria-label="확률 상승 개체" className="shrink-0 overflow-hidden border-t border-border/40 bg-card px-4 py-2">
  <div className="mb-1 flex items-center gap-2">{regionIcons[regionId]&&<img src={regionIcons[regionId].src} alt="" className="size-6 shrink-0 object-contain"/>}<p className="break-keep text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">{regionName}</span>에서 <span className="font-semibold text-primary">발견 확률이 대폭 상승</span>합니다.</p></div>
  {natives.length?<div tabIndex={0} aria-label="주 서식지 개체 슬라이드쇼" className="native-species-viewport overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="native-species-track flex w-max" style={{animationDuration:`${Math.max(18,natives.length*3)}s`}}>{[0,1].map(copy=><ul key={copy} aria-hidden={copy===1||undefined} className="flex shrink-0 gap-3 pr-3">{natives.map(item=><li key={item.id} className="flex w-20 shrink-0 flex-col items-center gap-1 py-1"><span data-discovered={item.discovered} className={item.discovered?'':'brightness-0 opacity-25 dark:brightness-0 dark:invert dark:opacity-40'}><CollectibleThumbnail path={item.thumbnail_path} name={item.discovered?item.name:'미발견 개체'} className="size-16"/></span><span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span aria-hidden="true" className="size-1.5 rounded-full" style={{backgroundColor:rarities[item.rarity].effectColor}}/>{rarities[item.rarity].label}</span></li>)}</ul>)}</div></div>:<div aria-hidden="true" className="flex h-24 items-center gap-4 motion-safe:animate-pulse">{[0,1,2,3,4].map(i=><span key={i} className="h-16 w-20 shrink-0 rounded-2xl bg-muted"/>)}</div>}
 </section>
}
