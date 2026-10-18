import { LandscapeImage } from '@/components/landscape-image'
﻿import { useEffect, useState } from 'react'
import { Fish, ChevronRight, LockKeyhole, Sailboat } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { rarities } from '@/lib/game/rarity'
import { RarityBadge } from '@/components/rarity-badge'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import { loadHarborCatalog } from '@/features/regions/harbor-catalog'
import type { CatalogEntry } from '@/features/collection/api'
import { loadRegionMap, regionImageUrl } from '@/features/regions/api'
import type { Region, RegionMap } from '@/features/regions/api'
import { DestinationStrip } from '@/features/regions/destination-strip'
import { regionIcons } from '@/features/regions/region-icons'

function Landscape({region}:{region:Region}){
 return <LandscapeImage src={regionImageUrl(region.image_path)} alt={region.name} className={`absolute inset-0 size-full object-cover ${region.unlocked?'':'grayscale brightness-[0.35]'}`}/>
}
export function HarborPage(){
 const {session}=useAuth()
 return <HarborMap key={session?.user.id??'guest'}/>
}
function HarborMap(){
 const navigate=useNavigate()
 const [map,setMap]=useState<RegionMap|null>(null)
 const [catalog,setCatalog]=useState<CatalogEntry[]>([])
 const [catalogError,setCatalogError]=useState(false)
 const [index,setIndex]=useState(0)
 const [nativesOpen,setNativesOpen]=useState(false)
 const [detail,setDetail]=useState<CatalogEntry|null>(null)
 const [error,setError]=useState(false)
 const [retry,setRetry]=useState(0)
 useEffect(()=>{
  let active=true;setError(false)
  void loadRegionMap().then(data=>{if(active){setMap(data);setIndex(Math.max(0,data.regions.findIndex((r:Region)=>r.id==='pongdang')))}}).catch(()=>{if(active)setError(true)})
  return()=>{active=false}
 },[retry])
 useEffect(()=>{
  let active=true;setCatalogError(false)
  void loadHarborCatalog().then(data=>{if(active)setCatalog(data)}).catch(()=>{if(active)setCatalogError(true)})
  return()=>{active=false}
 },[retry])
 const region=map?.regions[index]
 const natives=catalog.filter(item=>item.is_native&&item.native_region_id===region?.id).sort((a,b)=>rarities[a.rarity].rank-rarities[b.rarity].rank)
 function travel(){if(region?.unlocked)navigate(region.id===map?.currentRegion?`/region/${region.id}`:`/sailing/${region.id}`)}
 return <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden">
  {error?<div role="alert" className="space-y-3 rounded-2xl bg-muted p-5 text-sm"><p>항로를 불러오지 못했어요.</p><Button variant="outline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></div>:!region?<p role="status" className="grid min-h-80 place-items-center text-sm text-muted-foreground">여행할 바다를 찾는 중…</p>:<>
   <article aria-label="목적지" className="relative isolate flex min-h-0 flex-1 flex-col justify-center overflow-hidden bg-secondary px-4 pt-32 pb-4 text-white">
    <Landscape key={region.id} region={region}/><div className="pointer-events-none absolute inset-0 bg-slate-950/[0.38]"/>
    <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-background/80 via-background/50 to-transparent px-2 pt-2 pb-5">
<DestinationStrip>{map?.regions.map((item,i)=>{const fragment=catalog.find(s=>s.id===`map-${item.id}`);return <button key={item.id} aria-label={`${item.name} 지도`} aria-pressed={index===i} onClick={()=>setIndex(i)} className={`harbor-map-piece relative isolate flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-none px-2 pt-8 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring ${index===i?'harbor-map-selected':''}`}><span className={item.unlocked?'':'grayscale brightness-[0.3] opacity-60'}><CollectibleThumbnail fadeIn path={fragment?.thumbnail_path||item.map_image_path||`map/normal/map-${item.id}_thumbnail.png`} name={`${item.name} 지도`} className="size-20"/></span><span className="absolute inset-x-0 top-0 z-10 flex min-h-7 items-center justify-center gap-1 bg-slate-950/60 px-1 py-1 text-white" title={item.name}>{regionIcons[item.id]&&<img src={regionIcons[item.id].src} alt="" aria-hidden="true" className="size-4 shrink-0 object-contain"/>}<span className="min-w-0 truncate text-[10px] leading-4">{item.name}</span></span>{!item.unlocked&&<LockKeyhole aria-hidden="true" className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground"/>}</button>})}</DestinationStrip>
    </div>
    {!region.unlocked&&<span className="absolute right-4 top-32 grid size-11 place-items-center rounded-full bg-black/45"><LockKeyhole aria-label="잠긴 지역" className="size-6"/></span>}
    <div className="relative mx-auto flex w-full max-w-sm flex-col items-center gap-4 px-4 py-6 text-center" aria-live="polite"><h3 className="flex items-center justify-center gap-2 text-2xl font-normal tracking-tight drop-shadow-md">{regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" className="size-7"/>}{region.name}</h3><p className="max-w-64 text-sm leading-6 text-white/95 drop-shadow-md">{region.description}</p>
   <Button className="mt-2 min-h-12 w-full max-w-64 rounded-xl text-base shadow-md" disabled={!region.unlocked} onClick={travel}>{region.unlocked?<><Sailboat className="size-4"/>출항하기</>:<><LockKeyhole className="size-4"/>잠긴 해역</>}</Button>{!region.unlocked&&<Link to="/shop?tab=maps" className="block text-center text-xs text-white/85 underline underline-offset-4">지도 상점에서 구매하기</Link>}
    </div>
   </article>
   {region.unlocked&&<button onClick={()=>setNativesOpen(true)} className="flex min-h-14 shrink-0 items-center gap-3 border-t border-border bg-card px-4 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Fish aria-hidden="true" className="size-5 shrink-0 text-primary"/><span className="min-w-0 flex-1 text-sm">여기서만 만날 수 있어요</span><ChevronRight className="size-4 text-muted-foreground"/></button>}

  </>}
  <Dialog open={nativesOpen} onOpenChange={setNativesOpen}><DialogContent className="inset-x-0 bottom-0 top-auto left-0 flex max-h-[80dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col rounded-t-2xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"><DialogHeader className="shrink-0 pr-8"><DialogTitle className="flex items-center gap-2">{region&&regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" className="size-7 shrink-0"/>}{region?.name}</DialogTitle></DialogHeader>{catalogError?<p role="alert" className="py-6 text-center text-sm text-muted-foreground">도감을 불러오지 못했어요.<Button variant="ghost" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></p>:!natives.length?<p className="py-6 text-center text-sm text-muted-foreground">새로운 바다 친구들을 기다리고 있어요.</p>:<ul className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto overscroll-contain">{natives.map(item=><li key={item.id}><button onClick={()=>setDetail(item)} aria-label={item.discovered?`${item.name} 살펴보기`:'미발견 개체'} className={`flex w-full flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.rarity==='rare'?'border-blue-300/50 bg-blue-50 dark:bg-blue-950/40':item.rarity==='epic'?'border-purple-300/50 bg-purple-50 dark:bg-purple-950/40':item.rarity==='mythic'?'border-amber-300/50 bg-amber-50 dark:bg-amber-950/40':'border-border/50 bg-secondary/25'}`}><span className={item.discovered?'':'brightness-0 opacity-30'}><CollectibleThumbnail path={item.thumbnail_path} name={item.discovered?item.name:'미발견 개체'} className="size-20"/></span>{item.discovered&&<span className="text-sm">{item.name}</span>}<RarityBadge rarity={item.rarity}/></button></li>)}</ul>}</DialogContent></Dialog>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="rounded-3xl sm:max-w-sm"><DialogHeader><DialogTitle>{detail?.discovered?detail.name:'미발견 개체'}</DialogTitle><DialogDescription>{detail?.discovered?'이 구역에만 서식하는 특별한 개체예요.':'이곳에서 낚시하며 어떤 친구인지 발견해보세요.'}</DialogDescription></DialogHeader>{detail&&<><div className={`mx-auto ${detail.discovered?'':'brightness-0 opacity-30'}`}><CollectibleThumbnail path={detail.thumbnail_path} name={detail.discovered?detail.name:'미발견 개체'} className="size-32"/></div><RarityBadge rarity={detail.rarity}/>{detail.discovered&&<p className="text-sm leading-6 text-muted-foreground">{detail.description}</p>}</>}</DialogContent></Dialog>
 </section>
}
