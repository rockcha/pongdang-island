import {HarborMythicShowcase,regionalMythics} from '@/features/regions/harbor-mythic-showcase'
import {appArt} from '@/components/app-art'
import { NativeSpeciesStrip } from '@/features/regions/native-species-strip'
import { LandscapeImage } from '@/components/landscape-image'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { rarities } from '@/lib/game/rarity'
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
 const mythics=region?regionalMythics(catalog,region.id):[]
 function travel(){if(region?.unlocked)navigate(region.id===map?.currentRegion?`/region/${region.id}`:`/sailing/${region.id}`)}
 return <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-y-auto overscroll-contain">
  {error?<div role="alert" className="space-y-3 rounded-2xl bg-muted p-5 text-sm"><p>항로를 불러오지 못했어요.</p><Button variant="outline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></div>:!region?<p role="status" className="grid min-h-80 place-items-center text-sm text-muted-foreground">여행할 바다를 찾는 중…</p>:<>
   <article onDragStart={event=>event.preventDefault()} className="relative isolate flex min-h-[24rem] shrink-0 flex-1 flex-col overflow-hidden bg-secondary pt-32 text-white">
    <Landscape key={region.id} region={region}/><div className="pointer-events-none absolute inset-0 bg-slate-950/[0.38]"/>
    <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-background/80 via-background/50 to-transparent px-2 pt-2 pb-5">
<DestinationStrip>{map?.regions.map((item,i)=>{const fragment=catalog.find(s=>s.id===`map-${item.id}`);return <button key={item.id} aria-label={`${item.name} 지도`} aria-pressed={index===i} onClick={()=>setIndex(i)} className={`harbor-map-piece relative isolate flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-none px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring ${index===i?'harbor-map-selected':''}`}><span className={item.unlocked?'':'grayscale brightness-75 opacity-70'}><CollectibleThumbnail fadeIn path={fragment?.thumbnail_path||item.map_image_path||`map/normal/map-${item.id}_thumbnail.png`} name={`${item.name} 지도`} className="size-20"/></span></button>})}</DestinationStrip>
    </div>
    <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 py-4 text-center"><div className="relative translate-y-6 space-y-3"><h3 aria-live="polite" className="flex items-center justify-center gap-2 text-xl font-normal tracking-tight drop-shadow-md">{regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" className="size-7"/>}{region.name}</h3><p className="max-w-64 text-sm leading-6 text-white/95 drop-shadow-md">{region.description}</p></div>{mythics.length>0&&<HarborMythicShowcase key={region.id} items={mythics} regionName={region.name}/>}
    </div>
   </article>
   <div className={`relative z-10 grid shrink-0 border-t border-border bg-background text-foreground ${region.unlocked?'grid-cols-2':'grid-cols-1'}`}>
    <Button variant="ghost" className="flex h-20 min-w-0 flex-col gap-1 rounded-none border-r border-border bg-[#E8D1B8] px-2 text-sm font-medium text-[#5C3D29] hover:bg-[#DFC2A3]" onClick={()=>region.unlocked?travel():navigate(`/shop?tab=maps&region=${encodeURIComponent(region.id)}`)}>{region.unlocked?<appArt.rod className="size-8"/>:<appArt.shop className="size-8"/>}<span>{region.unlocked?'낚시 하기':'상점에서 구매하기'}</span></Button>
    {region.unlocked&&<Button variant="ghost" className="flex h-20 min-w-0 flex-col gap-1 rounded-none bg-background px-2 text-sm font-medium text-primary hover:bg-secondary" onClick={()=>navigate(`/expeditions?region=${region.id}`)}><appArt.expeditions className="size-8"/><span>어선 파견</span></Button>}
   </div>

   {!catalogError&&<NativeSpeciesStrip key={region.id} items={natives} regionId={region.id} regionName={region.name}/>}

  </>}
 </section>
}
