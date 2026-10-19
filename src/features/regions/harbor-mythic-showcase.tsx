import {useState} from 'react'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {CollectiblePreview} from '@/features/collection/collectible-preview'
import type {CatalogEntry} from '@/features/collection/api'
import './harbor-mythic-showcase.css'

export function regionalMythics(catalog:CatalogEntry[],regionId:string){
 return catalog.filter(item=>item.rarity==='mythic'&&item.kind!=='map'&&
  (regionId==='pongdang'?!item.is_native&&item.native_region_id==null:item.is_native&&item.native_region_id===regionId)&&
  item.habitats?.some(h=>h.id===regionId))
  .sort((a,b)=>a.name.localeCompare(b.name,'ko'))
}

function MythicArt({item}:{item:CatalogEntry}){
 return <span data-silhouette={!item.discovered} className={`harbor-mythic-art relative inline-flex ${item.discovered?'':'harbor-mythic-silhouette'}`}><CollectiblePreview species={item}/></span>
}

export function HarborMythicShowcase({items,regionName,stacked=false,interactive=true}:{items:CatalogEntry[];regionName:string;stacked?:boolean;interactive?:boolean}){
 const [selection]=useState(()=>Math.random())
 const [detail,setDetail]=useState<CatalogEntry|null>(null)
 const Card=interactive?'button':'div'
 const item=items[Math.floor(selection*items.length)]
 if(!item)return null
 return <section role="region" aria-label={`${regionName}\uC758 \uC2E0\uD654 \uAC1C\uCCB4`} className={`harbor-mythic-showcase relative w-full max-w-sm text-center ${stacked?'harbor-mythic-stacked':''}`}>
  <div className="relative flex items-center justify-center">
   <Card key={item.id} type={interactive?'button':undefined} aria-label={interactive?`${item.name} 소개 보기`:item.name} className="harbor-mythic-card harbor-mythic-enter relative grid min-w-0 flex-1 items-center gap-2 rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-100" onClick={interactive?()=>setDetail(item):undefined}>
    <span aria-hidden="true" className="harbor-mythic-halo pointer-events-none absolute inset-0"/>
    <span className="harbor-mythic-art-space"><MythicArt item={item}/></span>
    <span className="relative min-w-0"><span className="block text-xs tracking-[0.2em] text-amber-200 drop-shadow-md">신화</span><span className="mt-2 block break-keep text-xl leading-7 text-white drop-shadow-md">{item.name}</span></span>
   </Card>
  </div>
  {interactive&&<Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl text-center"><DialogHeader><DialogTitle>{detail?.name}</DialogTitle><DialogDescription>{regionName}에서 만날 수 있는 신화 개체예요.</DialogDescription></DialogHeader>{detail&&<><div className="harbor-mythic-detail mx-auto grid size-64 place-items-center rounded-full"><MythicArt item={detail}/></div><p className="px-3 text-sm leading-7 text-muted-foreground">{detail.description}</p><p className="text-[11px] text-muted-foreground">{detail.discovered?'도감에 기록된 전설이에요.':'아직 발견하지 못한 모습은 실루엣으로 보여요.'}</p></>}</DialogContent></Dialog>}
 </section>
}
