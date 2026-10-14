import { BaitInventoryDialog } from '@/features/fishing/fishing-panel'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, LockKeyhole, Map, MapPin, Sailboat } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { RarityBadge } from '@/components/rarity-badge'
import { loadRegionMap, regionImageUrl, setRegionTestLock } from '@/features/regions/api'
import type { RegionMap } from '@/features/regions/api'

function RegionImage({ path, name, locked }: { path:string; name:string; locked:boolean }) {
 const [failed,setFailed]=useState(false)
 useEffect(()=>setFailed(false),[path])
 return <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">{failed ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">지역 이미지를 준비 중이에요</div> : <img src={regionImageUrl(path)} alt={name} className={`h-full w-full object-cover ${locked?'grayscale brightness-75':''}`} onError={()=>setFailed(true)}/>} {locked&&<div className="absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-black/35 p-3 text-white"><LockKeyhole className="size-7" aria-label="잠긴 지역"/></span></div>}</div>
}
export function HarborPage() {
 const {session}=useAuth()
 return <HarborMap key={session?.user.id??'guest'}/>
}
function HarborMap() {
 const navigate=useNavigate()
 const [open,setOpen]=useState(false)
 const [map,setMap]=useState<RegionMap|null>(null)
 const [index,setIndex]=useState(0)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const active=useRef(true)
 const request=useRef(0)
 const lock=useRef(false)
 const touchX=useRef<number|null>(null)
 async function reload(reset=false){
  const version=++request.current
  setLoading(true);setError('')
  try{const data=await loadRegionMap();if(!active.current||version!==request.current)return;setMap(data);if(reset)setIndex(Math.max(0,data.regions.findIndex(r=>r.id===data.currentRegion)))}
  catch{if(active.current&&version===request.current)setError('지도를 불러오지 못했어요. 연결과 11 SQL 적용을 확인해주세요.')}
  finally{if(active.current&&version===request.current)setLoading(false)}
 }
 useEffect(()=>{active.current=true;void reload(true);return()=>{active.current=false;request.current++}},[])
 const current=map?.regions.find(r=>r.id===map.currentRegion)
 const region=map?.regions[index]
 function step(direction:number){if(busy)return;setIndex(value=>Math.max(0,Math.min((map?.regions.length??1)-1,value+direction)))}
 function travel(){
  if(!region||!region.unlocked||busy)return
  setOpen(false)
  navigate(region.id===map?.currentRegion?`/region/${region.id}`:`/sailing/${region.id}`)
 }
 async function toggleLock(){
  if(!region||lock.current)return
  lock.current=true;setBusy(true)
  try{const data=await setRegionTestLock(region.id,region.unlocked);if(active.current)setMap(data)}
  catch{toast.error('잠금 설정을 바꾸지 못했어요. 12 SQL과 테스트 설정을 확인해주세요.')}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 return <section className="space-y-6 py-6">
  <header><h1 className="text-2xl font-bold">선착장</h1><p className="mt-2 text-sm text-muted-foreground">다음 바다에는 어떤 이야기가 기다릴까요?</p></header>
  {current?<RegionImage path={current.image_path} name={current.name} locked={!current.unlocked}/>:<div className="flex aspect-square items-center justify-center rounded-2xl bg-sky-50"><Sailboat className="size-20 text-primary/50"/></div>}
  <div className="flex items-center justify-between gap-2"><div><p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3"/>현재 지역</p><h2 className="text-lg font-semibold">{current?.name??(loading?'불러오는 중…':'지역을 확인해주세요')}</h2></div>{current&&<RarityBadge rarity={current.rarity}/>}</div>
  {error&&!open&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  <Dialog open={open} onOpenChange={value=>{if(busy)return;setOpen(value);if(value)void reload(true)}}>
   <DialogTrigger render={<Button className="min-h-12 w-full"/>}><Map className="size-4"/>지도 열기</DialogTrigger>
   <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm">
    <DialogHeader><DialogTitle>바다 지도</DialogTitle><DialogDescription>지역을 넘겨보며 새로운 항로를 찾아보세요.</DialogDescription></DialogHeader>
    {loading&&<p role="status" className="text-sm text-muted-foreground">지도를 펼치는 중…</p>}
    {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void reload(true)}>다시 불러오기</Button></div>}
    {region&&!loading&&!error&&<div className="space-y-4" onTouchStart={event=>{touchX.current=event.touches[0].clientX}} onTouchEnd={event=>{if(touchX.current!==null){const delta=event.changedTouches[0].clientX-touchX.current;if(Math.abs(delta)>50)step(delta<0?1:-1)}touchX.current=null}}>
     <RegionImage path={region.image_path} name={region.name} locked={!region.unlocked}/>
     <div aria-live="polite" className="space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="text-lg font-bold">{region.name}</h3><RarityBadge rarity={region.rarity}/></div><p className="min-h-12 text-sm leading-6 text-muted-foreground">{region.description}</p></div>
     <p className="flex items-center gap-1 text-xs text-muted-foreground">{!region.requires_map_fragment?'기본 항로':region.hasFragment?'지도 조각 보유':<><LockKeyhole className="size-3"/>지도 조각이 필요해요</>}</p>
     <div className="flex items-center justify-between"><Button variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="이전 지역" disabled={index===0||busy} onClick={()=>step(-1)}><ChevronLeft/></Button><span className="text-xs text-muted-foreground">{index+1} / {map?.regions.length}</span><Button variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="다음 지역" disabled={index===(map?.regions.length??0)-1||busy} onClick={()=>step(1)}><ChevronRight/></Button></div>
     <Button className="min-h-11 w-full" disabled={!region.unlocked||busy} onClick={()=>void travel()}>{busy?'이동 중…':region.id===map?.currentRegion?'현재 지역 둘러보기':!region.unlocked?'잠긴 항로':'이곳으로 이동'}</Button>
     {map?.canTestLocks && region.requires_map_fragment && <div className="border-t pt-3"><Button variant="ghost" className="min-h-11 w-full text-xs text-muted-foreground" disabled={busy} onClick={()=>void toggleLock()}>{region.unlocked?'테스트: 지역 잠그기':'테스트: 지역 잠금 해제'}</Button></div>}
    </div>}
   </DialogContent>
  </Dialog>
  <BaitInventoryDialog />
  <p className="text-xs leading-5 text-muted-foreground">지도 조각을 보유하면 새로운 항로가 열려요. 도착한 지역에서 낚시할 수 있어요.</p>
 </section>
}
