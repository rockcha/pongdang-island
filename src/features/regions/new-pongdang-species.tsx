import {appArt} from '@/components/app-art'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {kindLabels,type CatalogEntry} from '@/features/collection/api'
import {rarities} from '@/lib/game/rarity'

// Curated October 20 release; names, descriptions and grades come from the catalog.
const releaseIds=new Set([
 'giseong-fish','giseong-webfoot-octopus','pongi-seahorse-rider',
 'pongi-jellyfish','pongi-crab','pongi-hammerhead','pongi-exploration-robot',
 'otter-furball','pongdang-merch-set','pongi-snack-wrapper',
 'sunken-pongdang-entrance','tiny-pongi-figurine','pongdang-island-sign',
])
const grades=['mythic','epic','rare','common'] as const
const tones={mythic:'from-amber-100/80 to-orange-50/30',epic:'from-purple-100/70 to-purple-50/20',rare:'from-sky-100/70 to-sky-50/20',common:'from-stone-100/80 to-stone-50/20'}
const kindIcons={fish:appArt.fish,decoration:appArt.decoration,trash:appArt.trash,map:appArt.map}
export function NewPongdangSpecies({catalog}:{catalog:CatalogEntry[]}){
 const items=catalog.filter(item=>releaseIds.has(item.id)&&item.native_region_id==='pongdang')
 if(!items.length)return <p className="px-6 py-12 text-center text-sm text-muted-foreground">새로운 개체를 준비하고 있어요.</p>
 return <div className="pb-8">
  <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/60 bg-background px-4 py-4"><appArt.island className="size-10"/><div><h2 className="text-base">퐁당섬 앞바다의 새 얼굴들</h2><p className="mt-1 text-xs text-muted-foreground">새롭게 찾아온 {items.length}종을 만나보세요.</p></div></div>
  <div className="space-y-7 px-4 pt-5">{grades.map(grade=>{
   const group=items.filter(item=>item.rarity===grade).sort((a,b)=>a.name.localeCompare(b.name,'ko'))
   if(!group.length)return null
   return <section key={grade} aria-label={`${rarities[grade].label} 신규 개체`}>
    <h3 className="mb-3 flex items-center gap-2 text-sm"><span aria-hidden="true" className="size-2 rounded-full" style={{backgroundColor:rarities[grade].effectColor}}/>{rarities[grade].label}<span className="text-xs tabular-nums text-muted-foreground">{group.length}</span></h3>
    <ul className="grid grid-cols-2 items-stretch gap-3">{group.map(item=>{const KindIcon=kindIcons[item.kind];return <li key={item.id} className={grade==='mythic'?'col-span-2':''}>
     <article className="h-full overflow-hidden rounded-xl border border-border/60 bg-background/80">
      <div className={`flex items-center justify-center bg-gradient-to-b px-3 py-4 ${tones[grade]}`}><div data-silhouette="true" className="brightness-0 opacity-80"><CollectibleThumbnail path={item.thumbnail_path} name={`${item.name} 실루엣`} className={grade==='mythic'?'size-48':'size-28'}/></div></div>
      <div className="px-3 pb-4 pt-3"><span role="img" aria-label={kindLabels[item.kind]} title={kindLabels[item.kind]} className="mb-1 inline-flex"><KindIcon className="size-6"/></span><h4 className="break-keep text-sm leading-5">{item.name} <span className="inline-block rounded-[2px] bg-red-600 px-1.5 py-0.5 align-middle text-[9px] font-semibold leading-3 text-white">NEW</span></h4><p className="mt-2 break-words text-xs leading-5 text-muted-foreground">{item.description}</p></div>
     </article>
    </li>})}</ul>
   </section>
  })}</div>
 </div>
}
