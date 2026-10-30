import {useEffect,useRef,useState} from 'react'
import {regionIcons} from '@/features/regions/region-icons'
import {Link} from 'react-router'
import {appArt} from '@/components/app-art'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {RegionLandscape} from '@/features/regions/region-landscape'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {loadRegionMap,type Region} from '@/features/regions/api'
import {loadHarborCatalog} from '@/features/regions/harbor-catalog'
import {HarborMythicShowcase,regionalMythics} from '@/features/regions/harbor-mythic-showcase'
import type {CatalogEntry} from '@/features/collection/api'
import {loadNotices,noticeProgress,type NoticeView} from '@/features/notices/api'
import {NewPongdangSpecies} from '@/features/regions/new-pongdang-species'
import {NewsSupporters} from '@/features/development-fund/news-supporters'

function eventDescription(body:string){
 return body.split('\n').filter(line=>!line.trim().startsWith('![')).join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[*#`]/g,'').replace(/\s+/g,' ').trim()
}
export function HomePage(){
 const {session}=useAuth()
 return <IslandHome key={session?.user.id??'guest'}/>
}
function IslandHome(){
 const [now,setNow]=useState(()=>Date.now())
 const swipe=useRef<{x:number;y:number}|null>(null)
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[])
 const [tab,setTab]=useState('regions'),[regions,setRegions]=useState<Region[]>([]),[catalog,setCatalog]=useState<CatalogEntry[]>([])
 const [events,setEvents]=useState<NoticeView[]|null>(null),[selected,setSelected]=useState<string|null>(null)
 const [regionError,setRegionError]=useState(false),[eventError,setEventError]=useState(false),[retry,setRetry]=useState(0),[loaded,setLoaded]=useState(false)
 useEffect(()=>{
  let active=true;setRegionError(false);setLoaded(false)
  void Promise.all([loadRegionMap(),loadHarborCatalog()]).then(([map,entries])=>{
   if(!active)return
   setRegions(map.regions);setCatalog(entries);setLoaded(true)
  }).catch(()=>{if(active)setRegionError(true)})
  return()=>{active=false}
 },[retry])
 useEffect(()=>{
  if(tab!=='events')return
  let active=true;setEventError(false);setEvents(null)
  void loadNotices('event','',0,false).then(data=>{if(active)setEvents(data.items.filter(n=>noticeProgress(n)!=='종료'))}).catch(()=>{if(active)setEventError(true)})
  return()=>{active=false}
 },[tab,retry])
 const recent=regions.filter(r=>{const date=Date.parse(r.created_at);return date<=now&&date>=now-7*24*60*60*1000}).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.sort_order-a.sort_order)
 const index=Math.max(0,recent.findIndex(r=>r.id===selected))
 const region=recent[index]
 function move(direction:number){if(recent.length>1)setSelected(recent[(index+direction+recent.length)%recent.length].id)}
 const mythics=region?regionalMythics(catalog,region.id).map(item=>({...item,discovered:false})):[]
 return <section className="flex min-h-0 min-w-0 flex-1 flex-col">
  <Tabs value={tab} onValueChange={value=>setTab(String(value))} className="flex min-h-0 flex-1 flex-col gap-0">
   <TabsList aria-label="퐁당섬 소식" className="segmented-control grid shrink-0 grid-cols-4"><TabsTrigger value="regions" className="min-h-14 min-w-0 flex-col gap-1 rounded-none px-1 py-2 text-xs"><appArt.map className="size-6"/>새로운 해역</TabsTrigger><TabsTrigger value="species" className="min-h-14 min-w-0 flex-col gap-1 rounded-none px-1 py-2 text-xs"><appArt.fish className="size-6"/>신규 어종</TabsTrigger><TabsTrigger value="supporters" className="min-h-14 min-w-0 flex-col gap-1 rounded-none px-1 py-2 text-xs"><appArt.developmentFund className="size-6"/>주주명단</TabsTrigger><TabsTrigger value="events" className="min-h-14 min-w-0 flex-col gap-1 rounded-none px-1 py-2 text-xs"><appArt.noticeEvent className="size-6"/>이벤트</TabsTrigger></TabsList>
   <TabsContent value="regions" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain">
    {regionError?<HomeError onRetry={()=>setRetry(v=>v+1)}/>:!loaded?<HomeLoading/>:region?<>
     <article key={region.id} aria-roledescription="슬라이드" aria-label={`새로운 해역 ${index+1}/${recent.length}`} tabIndex={0} onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}if(event.key==='ArrowRight'){event.preventDefault();move(1)}}} onTouchStart={event=>{const touch=event.touches[0];swipe.current={x:touch.clientX,y:touch.clientY}}} onTouchEnd={event=>{const touch=event.changedTouches[0],start=swipe.current;swipe.current=null;if(start&&Math.abs(touch.clientX-start.x)>50&&Math.abs(touch.clientX-start.x)>Math.abs(touch.clientY-start.y)*1.5)move(touch.clientX<start.x?1:-1)}} className="relative isolate flex h-full min-h-[26rem] touch-pan-y flex-col items-center justify-between overflow-hidden px-5 pb-7 pt-14 text-center text-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
      <span className="absolute right-4 top-3 rounded-full border border-white/25 bg-black/30 px-3 py-1 text-xs tabular-nums backdrop-blur-sm" aria-live="polite">{index+1}/{recent.length}</span>
      <RegionLandscape region={region} alt={`${region.name} 풍경`} position="bottom" className="-z-20"/>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-black/20 to-black/65"/>
      <div className="max-w-sm space-y-3"><h2 className="flex items-center justify-center gap-2 text-2xl font-medium drop-shadow-md"><img src={regionIcons[region.id]?.src??'/region-icons/pongdang.svg'} alt="" className="size-9 shrink-0 object-contain"/>{region.name}</h2><p className="text-sm leading-7 text-white/95 drop-shadow-md">{region.description}</p></div>
      {mythics.length>0&&<div className="flex min-h-0 w-full flex-1 items-center justify-center pb-6 pt-4"><HarborMythicShowcase key={region.id} items={mythics} regionName={region.name} interactive={false} isNew/></div>}
     </article>
    </>:<p className="p-8 text-center text-sm text-muted-foreground">새로운 해역을 준비하고 있어요.</p>}
   </TabsContent>
   <TabsContent value="species" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain">
    {regionError?<HomeError onRetry={()=>setRetry(v=>v+1)}/>:!loaded?<HomeLoading/>:<NewPongdangSpecies catalog={catalog} now={now}/>}
   </TabsContent>
   <TabsContent value="supporters" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"><NewsSupporters active={tab==='supporters'}/></TabsContent>
   <TabsContent value="events" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain">
    {eventError?<HomeError onRetry={()=>setRetry(v=>v+1)}/>:events===null?<HomeLoading/>:events.length?<div className="divide-y divide-border/60">{events.map(event=><article key={event.id} className="space-y-4 p-5"><Link to={`/square/notices/${event.id}`} className="block space-y-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"><h2 className="break-words text-xl font-medium leading-7">{event.title}</h2>{eventDescription(event.body)&&<p className="text-sm leading-6 text-muted-foreground">{eventDescription(event.body)}</p>}</Link>{event.images[0]&&event.urls[event.images[0]]&&<Link to={`/square/notices/${event.id}`} className="block overflow-hidden rounded-2xl border border-border/60 bg-secondary/20"><img src={event.urls[event.images[0]]} alt={`${event.title} 포스터`} loading="lazy" className="h-auto w-full object-contain"/></Link>}</article>)}</div>:<div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><appArt.noticeEvent className="size-16 opacity-60"/><p className="text-sm text-muted-foreground">새로운 이벤트를 준비하고 있어요.</p></div>}
   </TabsContent>
  </Tabs>
 </section>
}
function HomeLoading(){return <div role="status" aria-label="섬 소식 불러오는 중" className="space-y-4 p-5 motion-safe:animate-pulse"><div className="h-8 w-1/2 rounded bg-secondary"/><div className="h-64 rounded-2xl bg-secondary/60"/></div>}
function HomeError({onRetry}:{onRetry:()=>void}){return <div role="alert" className="space-y-3 p-8 text-center text-sm"><p>섬 소식을 불러오지 못했어요.</p><Button variant="outline" onClick={onRetry}>다시 불러오기</Button></div>}
