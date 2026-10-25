import {useEffect,useRef,useState} from 'react'
import {ChevronRight,Plus,Waves,Pencil} from 'lucide-react'
import {GoldIcon} from '@/features/gold/gold-provider'
import type {AquariumTank} from './api'
import type {OwnedCollectible} from '@/features/collection/api'
import {TankInhabitants} from './tank-inhabitants'
import {AquariumBackdrop} from './aquarium-backdrop'
import {themePanoramaUrl} from './theme-panorama'

type OverviewState={tanks:AquariumTank[];catalog:{id:string;name:string;image_path:string}[];tankCapacity?:number;tankPrice?:number}
function TankCard({tank,index,items,background,capacity,busy,onSelect,onRename}:{tank:AquariumTank;index:number;items:OwnedCollectible[];background:OverviewState['catalog'][number]|undefined;capacity?:number;busy:boolean;onSelect:()=>void;onRename?:()=>void}){
 const root=useRef<HTMLDivElement>(null)
 const [visible,setVisible]=useState(typeof IntersectionObserver==='undefined')
 const src=themePanoramaUrl(background?.image_path)
 useEffect(()=>{
  if(!root.current||typeof IntersectionObserver==='undefined')return
  const observer=new IntersectionObserver(entries=>setVisible(entries[0]?.isIntersecting??false),{rootMargin:'80px'})
  observer.observe(root.current);return()=>observer.disconnect()
 },[])
 return <div ref={root} className="group block w-full shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-background text-left shadow-sm">
  <div className="flex min-h-12 items-center gap-2 px-3"><span className="text-[10px] tabular-nums text-muted-foreground">{String(index+1).padStart(2,'0')}</span><div className="flex min-w-0 flex-1 items-center"><button type="button" disabled={busy} onClick={onSelect} aria-label={`${tank.name} 어항 열기`} className="min-h-11 min-w-0 truncate rounded px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60">{tank.name}</button>{onRename&&<button type="button" disabled={busy} onClick={onRename} aria-label={`${tank.name} 이름 수정`} className="grid min-h-11 min-w-9 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-secondary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"><Pencil aria-hidden="true" className="size-3.5"/></button>}</div><button type="button" disabled={busy} onClick={onSelect} aria-label={`${tank.name} 어항으로 이동`} className="flex min-h-11 shrink-0 items-center gap-2 rounded px-1 text-[11px] tabular-nums text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"><span>{capacity===undefined?`${items.length}개`:`${items.length} / ${capacity}`}</span><ChevronRight aria-hidden="true" className="size-3.5 text-primary"/></button></div>
  <button type="button" disabled={busy} onClick={onSelect} aria-label={`${tank.name} 미리보기 열기`} className="relative block w-full overflow-hidden bg-cyan-100 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-60" style={{aspectRatio:'1.875'}}><span className="pointer-events-none absolute inset-0">
   {visible?<TankInhabitants preview items={items} world={src?{columns:3,overview:true,initialView:0,canPan:()=>false}:undefined} scenery={<AquariumBackdrop background={background} panorama={src?{src,view:0,zoom:1/3}:undefined}/>}/>:<AquariumBackdrop background={background} panorama={src?{src,view:0,zoom:1/3}:undefined}/>}
  </span></button>
 </div>
}

export function AquariumOverview({state,items,busy,onSelect,onRename,onAdd,scrollTop,onScroll,label='내 어항 목록'}:{state:OverviewState;items:OwnedCollectible[];busy:boolean;onSelect:(id:string)=>void;onRename?:(id:string)=>void;onAdd?:()=>void;scrollTop:number;onScroll:(value:number)=>void;label?:string}){
 const root=useRef<HTMLDivElement>(null)
 useEffect(()=>{if(root.current)root.current.scrollTop=scrollTop},[])
 return <div ref={root} aria-label={label} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-5" onScroll={event=>onScroll(event.currentTarget.scrollTop)}>
  <div className="flex flex-col gap-4" style={{minHeight:'100%'}}>{state.tanks.map((tank,index)=><TankCard key={tank.id} tank={tank} index={index} background={state.catalog.find(b=>b.id===tank.background_id)} items={items.filter(item=>item.tank_id===tank.id)} capacity={state.tankCapacity} busy={busy} onSelect={()=>onSelect(tank.id)} onRename={onRename?()=>onRename(tank.id):undefined}/>)}
   {onAdd&&<button type="button" disabled={busy} onClick={onAdd} className="relative flex min-h-44 w-full flex-1 shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-primary/25 bg-gradient-to-b from-secondary/15 to-secondary/45 px-5 py-7 text-primary outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
    <Waves aria-hidden="true" className="pointer-events-none absolute -bottom-5 -left-4 size-36 text-primary/[.04]"/><span className="grid size-10 place-items-center rounded-full border border-primary/15 bg-background/80"><Plus aria-hidden="true" className="size-5"/></span><span className="text-sm">어항 추가하기</span><span className="text-[11px] text-muted-foreground">새로운 바다를 꾸며보세요</span><span className="inline-flex items-center gap-1 text-xs tabular-nums"><GoldIcon className="size-4"/>{(state.tankPrice??350).toLocaleString('ko-KR')}</span>
   </button>}
  </div>
 </div>
}
