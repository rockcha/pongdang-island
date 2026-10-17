import { useEffect, useState } from 'react'
import { BookOpen, ChevronRight, LockKeyhole, Map, Sailboat } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RarityBadge } from '@/components/rarity-badge'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import { loadHarborCatalog } from '@/features/regions/harbor-catalog'
import type { CatalogEntry } from '@/features/collection/api'
import { loadRegionMap, regionImageUrl } from '@/features/regions/api'
import type { Region, RegionMap } from '@/features/regions/api'
import { DestinationStrip } from '@/features/regions/destination-strip'
import { regionIcons } from '@/features/regions/region-icons'

function Landscape({region}:{region:Region}){
 const [failed,setFailed]=useState(false)
 return failed?<div className="absolute inset-0 grid place-items-center bg-secondary text-sm text-primary">지역 이미지를 준비 중이에요</div>:<img src={regionImageUrl(region.image_path)} alt={region.name} onError={()=>setFailed(true)} className={`absolute inset-0 size-full object-cover ${region.unlocked?'':'grayscale brightness-[0.35]'}`}/>
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
 const natives=catalog.filter(item=>item.is_native&&item.native_region_id===region?.id)
 function travel(){if(region?.unlocked)navigate(region.id===map?.currentRegion?`/region/${region.id}`:`/sailing/${region.id}`)}
 return <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-3 overflow-hidden py-3">
  <DestinationStrip>{map?.regions.map((item,i)=>{const fragment=catalog.find(s=>s.id===`map-${item.id}`);return <button key={item.id} aria-label={`${item.name} 지도`} aria-pressed={index===i} onClick={()=>setIndex(i)} className={`harbor-map-piece relative isolate flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring ${index===i?'harbor-map-selected':''}`}><span className={item.unlocked?'':'grayscale brightness-[0.3] opacity-60'}>{(item.map_image_path||fragment)?<CollectibleThumbnail path={item.map_image_path||fragment!.thumbnail_path} name={`${item.name} 지도`} className="size-20"/>:<Map className="m-2 size-14 text-primary/60"/>}</span>{!item.unlocked&&<LockKeyhole aria-hidden="true" className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground"/>}</button>})}</DestinationStrip>
  {error?<div role="alert" className="space-y-3 rounded-2xl bg-muted p-5 text-sm"><p>항로를 불러오지 못했어요.</p><Button variant="outline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></div>:!region?<p role="status" className="grid min-h-80 place-items-center text-sm text-muted-foreground">여행할 바다를 찾는 중…</p>:<>
   <article aria-label="목적지" className="relative isolate flex min-h-0 flex-1 flex-col justify-end overflow-hidden bg-secondary p-4 text-white">
    <Landscape key={region.id} region={region}/><div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent"/>
    <span className="absolute left-4 top-4 rounded-full bg-black/20 px-3 py-1.5 text-[11px] backdrop-blur-md">{region.id===map?.currentRegion?'현재 머무는 바다':region.unlocked?'탐험 가능한 바다':'아직 닿지 않은 바다'}</span>
    {!region.unlocked&&<span className="absolute left-1/2 top-[28%] grid size-14 -translate-x-1/2 place-items-center rounded-full bg-black/25 backdrop-blur-sm"><LockKeyhole aria-label="잠긴 지역" className="size-6"/></span>}
    <div className="relative flex flex-col items-center gap-3 pt-20 text-center" aria-live="polite"><h3 className="flex items-center justify-center gap-2 text-2xl font-normal tracking-tight">{regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" className="size-7"/>}{region.name}</h3>{region.unlocked&&<p className="max-w-xs text-sm leading-6 text-white/80">{region.description}</p>}
   <Button className="mt-1 min-h-12 w-full max-w-64 rounded-xl text-base shadow-sm" disabled={!region.unlocked} onClick={travel}>{region.unlocked?<><Sailboat className="size-4"/>{region.id===map?.currentRegion?'현재 바다에서 낚시하기':'항해하기'}</>:<><LockKeyhole className="size-4"/>잠긴 해역</>}</Button>{!region.unlocked&&<Link to="/shop?tab=maps" className="block text-center text-xs text-white/85 underline underline-offset-4">지도 상점에서 구매하기</Link>}
    </div>
   </article>
   {region.unlocked&&<button onClick={()=>setNativesOpen(true)} className="flex min-h-14 shrink-0 items-center gap-3 rounded-xl border border-border/60 bg-card px-4 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><BookOpen className="size-5 text-primary"/><span className="flex-1 text-sm">토착종 도감</span><span className="text-xs text-muted-foreground">{catalogError?'불러오기 실패':`${natives.filter(item=>item.discovered).length} / ${natives.length} 발견`}</span><ChevronRight className="size-4 text-muted-foreground"/></button>}

  </>}
  <Dialog open={nativesOpen} onOpenChange={setNativesOpen}><DialogContent className="inset-x-0 bottom-0 top-auto left-0 flex max-h-[80dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col rounded-t-2xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"><DialogHeader className="shrink-0 pr-8"><DialogTitle>{region?.name} · 토착종 도감</DialogTitle><DialogDescription>{natives.filter(item=>item.discovered).length} / {natives.length} 발견</DialogDescription></DialogHeader>{catalogError?<p role="alert" className="py-6 text-center text-sm text-muted-foreground">도감을 불러오지 못했어요.<Button variant="ghost" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></p>:!natives.length?<p className="py-6 text-center text-sm text-muted-foreground">새로운 바다 친구들을 기다리고 있어요.</p>:<ul className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto overscroll-contain">{natives.map(item=><li key={item.id}><button onClick={()=>setDetail(item)} aria-label={item.discovered?`${item.name} 살펴보기`:'미발견 개체'} className="flex w-full flex-col items-center gap-2 rounded-xl border border-border/50 bg-secondary/25 p-3 text-center hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className={item.discovered?'':'brightness-0 opacity-30'}><CollectibleThumbnail path={item.thumbnail_path} name={item.discovered?item.name:'미발견 개체'} className="size-20"/></span><span className="text-sm">{item.discovered?item.name:'아직 만나지 못한 친구'}</span><RarityBadge rarity={item.rarity}/></button></li>)}</ul>}</DialogContent></Dialog>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="rounded-3xl sm:max-w-sm"><DialogHeader><DialogTitle>{detail?.discovered?detail.name:'아직 만나지 못한 친구'}</DialogTitle><DialogDescription>{detail?.discovered?'이 구역에만 서식하는 특별한 개체예요.':'이곳에서 낚시하며 어떤 친구인지 발견해보세요.'}</DialogDescription></DialogHeader>{detail&&<><div className={`mx-auto ${detail.discovered?'':'brightness-0 opacity-30'}`}><CollectibleThumbnail path={detail.thumbnail_path} name={detail.discovered?detail.name:'미발견 개체'} className="size-32"/></div><RarityBadge rarity={detail.rarity}/>{detail.discovered&&<p className="text-sm leading-6 text-muted-foreground">{detail.description}</p>}</>}</DialogContent></Dialog>
 </section>
}
