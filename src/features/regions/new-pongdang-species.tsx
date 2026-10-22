import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {TreasureTrashBadge} from '@/features/collection/treasure-trash-badge'
import type {CatalogEntry} from '@/features/collection/api'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {regionIcons} from './region-icons'
import {rarities} from '@/lib/game/rarity'
import releases from './species-releases.json'
import {collectibleCardTones as tones} from '@/features/collection/collectible-card-tones'

const week=7*24*60*60*1000
export function recentSpeciesIds(now:number){
 // A replacement image or price change must not restart a species' release window.
 const firstRelease=new Map<string,number>()
 for(const release of releases){
  const time=Date.parse(release.releasedAt)
  for(const id of release.speciesIds)firstRelease.set(id,Math.min(firstRelease.get(id)??Infinity,time))
 }
 return new Set([...firstRelease].filter(([,time])=>time<=now&&now<time+week).map(([id])=>id))
}
const grades=['common','rare','epic','mythic'] as const
export function NewPongdangSpecies({catalog,now=Date.now()}:{catalog:CatalogEntry[];now?:number}){
 const releaseIds=recentSpeciesIds(now)
 const items=catalog.filter(item=>releaseIds.has(item.id))
 if(!items.length)return <p className="px-6 py-12 text-center text-sm text-muted-foreground">새로운 개체를 준비하고 있어요.</p>
 return <Tabs defaultValue="common" className="pb-8">
  <div className="sticky top-0 z-10 border-b border-border/60 bg-background px-4 pt-4 pb-3"><TabsList aria-label="신규 개체 등급" className="p-1">{grades.map(grade=><TabsTrigger key={grade} value={grade} className="min-h-11 gap-1 px-2 text-xs">{rarities[grade].label}<span className="text-[10px] tabular-nums opacity-60">{items.filter(item=>item.rarity===grade).length}</span></TabsTrigger>)}</TabsList></div>
  <div className="px-4 pt-5">{grades.map(grade=>{
   const group=items.filter(item=>item.rarity===grade).sort((a,b)=>a.name.localeCompare(b.name,'ko'))
   return <TabsContent key={grade} value={grade} className="mt-0" aria-label={`${rarities[grade].label} 신규 개체`}>
    <h3 className="mb-3 flex items-center gap-2 text-sm"><span aria-hidden="true" className="size-2 rounded-full" style={{backgroundColor:rarities[grade].effectColor}}/>{rarities[grade].label}<span className="text-xs tabular-nums text-muted-foreground">{group.length}</span></h3>
    {!group.length&&<p className="py-8 text-center text-sm text-muted-foreground">새로 등록된 {rarities[grade].label} 개체가 없어요.</p>}
    <ul className="grid grid-cols-2 items-stretch gap-3">{group.map(item=>{const region=item.native_region_id?regionIcons[item.native_region_id]:undefined;return <li key={item.id} className="min-w-0">
     <article className={`relative h-full overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b ${tones[grade]}`}>
      <span className="pointer-events-none absolute left-2 top-2"><TreasureTrashBadge speciesId={item.id}/></span>
      <div className="flex justify-center px-3 pt-3"><CollectibleThumbnail path={item.thumbnail_path} name={item.name} className="h-32 w-full [&_img]:brightness-0" loading="lazy"/></div>
      <div className="px-3 pb-4 pt-3">{region&&<img src={region.src} alt={`주 서식지: ${region.name}`} title={region.name} className="mb-1 size-6 object-contain"/>}<h4 className="break-keep text-sm leading-5">{item.name} <span className="inline-block rounded-[2px] bg-red-600 px-1.5 py-0.5 align-middle text-[9px] font-semibold leading-3 text-white">NEW</span></h4><p className="mt-2 break-words text-xs leading-5 text-muted-foreground">{item.description}</p></div>
     </article>
    </li>})}</ul>
   </TabsContent>
  })}</div>
 </Tabs>
}
