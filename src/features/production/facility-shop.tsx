import {useId,useState,type ReactNode} from 'react'
import {Link} from 'react-router'
import {ArrowRight,Minus,Plus,Search,LoaderCircle} from 'lucide-react'
import {appArt} from '@/components/app-art'
import {IslandSelect} from '@/components/island-select'
import {LandscapeImage} from '@/components/landscape-image'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {GoldIcon} from '@/features/gold/gold-provider'
import type {ProductionFacility} from './api'
import type {BaitFacility} from './bait-production-api'
import {baitProductionArt} from './bait-production-art'
import {productionDuration} from './facilities'

type Facility=ProductionFacility|BaitFacility
const isBait=(site:Facility):site is BaitFacility=>'bait_id' in site
const artwork=(site:Facility)=>isBait(site)?baitProductionArt(site):site.image_path
const owned=(site:Facility)=>site.ownedCount??('owned' in site&&site.owned?1:0)
const ownerships=[{value:'all',label:'전체 보유 상태'},{value:'owned',label:'보유한 생산소'},{value:'unowned',label:'미보유 생산소'}] as const
const sorts=[{value:'price',label:'가격 싼 순'},{value:'output',label:'생산량 많은 순'},{value:'duration',label:'시간 짧은 순'},{value:'input',label:'소모량 적은 순'},{value:'storage',label:'보관 기간 긴 순'}] as const
const compactDuration=(minutes:number)=>minutes>0&&minutes%60===0?`${minutes/60}시간`:`${minutes.toLocaleString('ko-KR',{maximumFractionDigits:2})}분`
function InputIcon({site,className}:{site:Facility;className:string}){
 const Icon=isBait(site)?appArt.fuel:site.kind==='trash'?appArt.trash:appArt.fish
 return <Icon className={className}/>
}
function OutputIcon({site,className}:{site:Facility;className:string}){
 return isBait(site)?<img src={site.image_path} alt="" loading="lazy" className={className+' object-contain'}/>:<appArt.fuel className={className}/>
}
function Stat({icon,label,children}:{icon:ReactNode;label:string;children:ReactNode}){
 return <span aria-label={label} title={label} className="flex min-w-0 flex-col items-center justify-center gap-0.5 whitespace-nowrap @[100px]:flex-row">{icon}<span>{children}</span></span>
}
export function FacilityShop({kind,facilities,gold,loading,error,busy,pending=false,selectedId,onSelect,onBuy,onRetry}:{kind:'bait'|'fuel';facilities:Facility[];gold:number;fuel:number;loading:boolean;error:string;busy:boolean;pending?:boolean;selectedId:string|null;onSelect:(id:string|null)=>void;onBuy:(id:string,quantity:number)=>void|Promise<unknown>;onRetry:()=>void}){
 const tabId=useId()
 const [category,setCategory]=useState(kind==='fuel'?'trash':'all'),[ownership,setOwnership]=useState<typeof ownerships[number]['value']>('all'),[sort,setSort]=useState<typeof sorts[number]['value']>('price'),[search,setSearch]=useState('')
 const [detailId,setDetailId]=useState<string|null>(null),[quantity,setQuantity]=useState<number|''>(1),[submitted,setSubmitted]=useState(false)
 const detail=facilities.find(site=>site.id===(selectedId??detailId))
 const locked=busy||pending
 const enabled=facilities.filter(site=>!('enabled' in site)||site.enabled)
 const categories=[{value:'all',label:'모든 생산 미끼'},...Array.from(new Map(enabled.filter(isBait).map(site=>[site.bait_id,{value:site.bait_id,label:site.baitName,icon:<img src={site.image_path} alt="" loading="lazy" className="size-9 shrink-0 object-contain"/>}])).values())]
 const inputCount=(site:Facility)=>isBait(site)?site.fuel_cost:site.input_count
 const metric=(site:Facility)=>sort==='output'?site.output_count:sort==='duration'?site.production_minutes:sort==='input'?inputCount(site):sort==='storage'?site.storage_minutes:site.price
 const visible=enabled.filter(site=>(category==='all'||(isBait(site)?site.bait_id:site.kind)===category)&&(ownership==='all'||(ownership==='owned'?owned(site)>0:owned(site)===0))&&`${site.name} ${isBait(site)?site.baitName:''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).toSorted((a,b)=>(metric(a)-metric(b))*(sort==='output'||sort==='storage'?-1:1)||a.price-b.price||a.name.localeCompare(b.name,'ko'))
 const maxQuantity=detail?Math.min(100,detail.price>0?Math.max(0,Math.floor(gold/detail.price)):100):1
 const count=Math.max(1,Math.min(Math.max(1,maxQuantity),Number(quantity)||1)),total=(detail?.price??0)*count
 const ownedPath=kind==='bait'?'/bait-production':'/production',title=kind==='bait'?'미끼 생산소':'연료 생산소'
 const close=()=>{if(!locked){setSubmitted(false);onSelect(null)}}
 const issue=error&&<div role="alert" className="text-xs leading-5 text-destructive">{error}<Button variant="outline" className="mt-2 min-h-11 w-full text-xs" disabled={busy} onClick={onRetry}>다시 확인</Button></div>
 return <section aria-label={title+' 상점'} className="flex min-h-0 flex-1 flex-col overflow-hidden">
  {kind==='fuel'&&<div role="tablist" aria-label="생산소 종류" className="grid shrink-0 grid-cols-2 border-b border-border/60">{([{id:'trash',label:'재활용',Icon:appArt.trash},{id:'fish',label:'어유 정제',Icon:appArt.fish}] as const).map(({id,label,Icon})=><button key={id} id={tabId+'-'+id} type="button" role="tab" aria-selected={category===id} aria-controls={tabId+'-panel'} tabIndex={category===id?0:-1} onClick={()=>setCategory(id)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'trash':event.key==='End'?'fish':category==='trash'?'fish':'trash';setCategory(next);document.getElementById(tabId+'-'+next)?.focus()}} className={`flex min-h-14 items-center justify-center gap-2 border-r border-border/60 px-3 text-sm outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${category===id?'bg-secondary text-primary':'bg-background text-muted-foreground hover:bg-secondary/30'}`}><Icon className="size-6"/>{label}</button>)}</div>}
  <div className="shrink-0 space-y-2 border-b border-border/60 bg-background p-3">
   {enabled.length>12&&<label className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/15 px-3"><Search aria-hidden className="size-4 shrink-0 text-muted-foreground"/><input type="search" aria-label={kind==='bait'?'미끼 생산소 검색':'생산소 이름 검색'} placeholder={kind==='bait'?'생산소 또는 미끼 검색':'생산소 이름 검색'} value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label>}
   {kind==='bait'&&<IslandSelect label="생산 미끼 선택" value={category} onChange={setCategory} options={categories} className="w-full"/>}
   <div className="grid grid-cols-2 gap-2"><IslandSelect label="생산소 보유 필터" value={ownership} onChange={setOwnership} options={ownerships}/><IslandSelect label="생산소 정렬" value={sort} onChange={setSort} options={sorts}/></div>
   <p className="text-[11px] text-muted-foreground">{visible.length}종 · 수치는 1회 생산 기준</p>
  </div>
  <div id={kind==='fuel'?tabId+'-panel':undefined} role={kind==='fuel'?'tabpanel':undefined} aria-labelledby={kind==='fuel'?tabId+'-'+category:undefined} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
   {submitted&&!selectedId&&!busy&&<div role="status" className="flex items-center justify-between gap-2 border-b bg-secondary/30 px-3 py-2 text-xs"><span>생산소를 구매했어요.</span><Link to={ownedPath} className="flex min-h-11 items-center gap-1 text-primary">내 생산소 보기<ArrowRight className="size-3.5"/></Link></div>}
   {!selectedId&&issue&&<div className="p-4">{issue}</div>}
   {loading?<p role="status" className="flex justify-center gap-2 p-10 text-xs"><LoaderCircle className="size-4 animate-spin"/>불러오는 중</p>:<>
    <ul className="grid grid-cols-3">{visible.map(site=><li key={site.id} className="@container min-w-0 overflow-hidden border-r border-b border-border/60 bg-card"><article aria-label={site.name} className="h-full"><button type="button" aria-label={site.name+' 상세 보기'} disabled={locked} onClick={()=>{setDetailId(site.id);setQuantity(1);setSubmitted(false);onSelect(site.id)}} className="flex h-full w-full min-w-0 flex-col items-center px-1 pt-2 pb-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring">
     <div className="relative aspect-square w-full shrink-0"><LandscapeImage src={artwork(site)} alt="" loading="lazy" retryable={false} className="absolute inset-0 size-full object-contain"/>{owned(site)>0&&<span className="absolute right-1 top-1 rounded-full bg-background/95 px-1.5 py-0.5 text-[10px] text-primary">보유 {owned(site)}곳</span>}</div>
     <h2 className="mt-1 h-10 w-full shrink-0 px-1 text-xs leading-5 line-clamp-2 [overflow-wrap:anywhere]">{site.name}</h2>
     {isBait(site)&&<span className="mb-2 h-4 w-full truncate px-1 text-[9px] text-muted-foreground">{site.baitName}</span>}
     <span className="mb-2 grid h-20 w-full shrink-0 grid-cols-2 grid-rows-2 gap-y-1 text-[9px] leading-4 tabular-nums text-muted-foreground @[100px]:h-12 @[120px]:text-[10px]">
      <Stat label={`1회 생산량 ${site.output_count}개`} icon={<OutputIcon site={site} className="size-3.5 shrink-0"/>}>{site.output_count}개</Stat>
      <Stat label={`생산 시간 ${productionDuration(site.production_minutes)}`} icon={<img src="/app-icons/voyage-clock.png" alt="" loading="lazy" className="size-4 shrink-0 object-contain"/>}>{compactDuration(site.production_minutes)}</Stat>
      <Stat label={`소모 ${isBait(site)?'연료':site.kind==='trash'?'쓰레기':'물고기'} ${inputCount(site)}개`} icon={<InputIcon site={site} className="size-3.5 shrink-0"/>}>{inputCount(site)}개</Stat>
      <Stat label={`완료 후 보관 기간 ${productionDuration(site.storage_minutes)}`} icon={<img src="/app-icons/production-hourglass-v1.webp" alt="" loading="lazy" className="size-4 shrink-0 object-contain"/>}>{compactDuration(site.storage_minutes)}</Stat>
     </span><span className="mt-auto flex h-5 shrink-0 items-center gap-1 whitespace-nowrap text-xs text-primary"><GoldIcon className="size-3"/>{site.price.toLocaleString('ko-KR')}</span>
    </button></article></li>)}</ul>
    {!visible.length&&<div className="space-y-3 px-4 py-10 text-center"><p className="text-xs text-muted-foreground">조건에 맞는 생산소가 없어요.</p><Button variant="outline" onClick={()=>{setSearch('');setCategory(kind==='fuel'?'trash':'all');setOwnership('all');setSort('price')}}>검색·필터 초기화</Button></div>}
   </>}
  </div>
  <Dialog open={!!selectedId} onOpenChange={open=>{if(!open)close()}} onOpenChangeComplete={open=>{if(!open&&!selectedId)setDetailId(null)}}><DialogContent showCloseButton={!locked} className="flex max-h-[85dvh] w-[calc(100%-2rem)] min-w-0 max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
   <DialogHeader className="shrink-0 px-4 pt-4 pb-3 pr-12"><div className="flex min-w-0 items-center gap-3">{detail&&<LandscapeImage src={artwork(detail)} alt="" retryable={false} className="size-16 shrink-0 object-contain"/>}<div className="min-w-0 space-y-1.5"><DialogTitle className="text-base leading-6 [overflow-wrap:anywhere]">{detail?.name}</DialogTitle><DialogDescription className="text-xs">{detail&&(isBait(detail)?detail.baitName+' 생산':detail.kind==='trash'?'쓰레기로 연료 생산':'물고기로 연료 생산')}</DialogDescription></div></div></DialogHeader>
   {detail&&<><div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4">
    <p className="text-xs leading-6 text-muted-foreground">{detail.description}</p>
    <dl className="space-y-3 text-xs">
     <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">1회 생산량</dt><dd className="flex items-center gap-1.5"><OutputIcon site={detail} className="size-5 shrink-0"/>{detail.output_count}개</dd></div>
     <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">생산 시간</dt><dd>{productionDuration(detail.production_minutes)}</dd></div>
     <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">1회 소모 {isBait(detail)?'연료':'재료'}</dt><dd className="flex items-center gap-1.5"><InputIcon site={detail} className="size-5 shrink-0"/>{!isBait(detail)&&(detail.kind==='trash'?'쓰레기 ':'물고기 ')}{inputCount(detail)}개</dd></div>
     <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">완료 후 보관 기간</dt><dd>{productionDuration(detail.storage_minutes)}</dd></div>
    </dl><p className="border-t border-border/60 pt-3 text-[11px] leading-5 text-muted-foreground">완료 후 보관 기간 안에 수령해 주세요. 기간이 지나면 생산물이 만료돼요. 구매한 생산소는 내 생산소에서 가동할 수 있어요.</p>
    {issue}
   </div><div className="shrink-0 border-t border-border/60 bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
    <p className="mb-3 text-xs text-muted-foreground">보유 {owned(detail)}곳</p>
    <div className="mb-2 flex justify-between gap-2 text-[11px] text-muted-foreground"><span>구매 수량</span><span className="flex items-center gap-1">개당 <GoldIcon className="size-3"/>{detail.price.toLocaleString('ko-KR')}</span></div>
    <div className="grid grid-cols-2 gap-2"><div className="grid min-h-12 min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center rounded-lg border">
     <Button variant="ghost" size="icon" className="size-10" aria-label="구매 수량 줄이기" disabled={locked||count<=1} onClick={()=>setQuantity(count-1)}><Minus className="size-4"/></Button>
     <input aria-label="구매 수량" type="number" inputMode="numeric" min={1} max={Math.max(1,maxQuantity)} value={quantity===''?'':count} disabled={locked} onBlur={()=>{if(quantity==='')setQuantity(1)}} onChange={e=>setQuantity(e.target.value===''?'':Math.max(1,Math.min(Math.max(1,maxQuantity),Math.floor(e.target.valueAsNumber)||1)))} className="h-12 w-full min-w-0 bg-transparent text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/>
     <Button variant="ghost" size="icon" className="size-10" aria-label="구매 수량 늘리기" disabled={locked||count>=maxQuantity} onClick={()=>setQuantity(count+1)}><Plus className="size-4"/></Button>
    </div><Button className="min-h-12 min-w-0 gap-1 rounded-lg px-2 text-xs" aria-label={pending?'구매 결과 다시 확인':`${total.toLocaleString('ko-KR')}골드로 구매`} disabled={busy||!pending&&(quantity===''||maxQuantity<1)} onClick={()=>{if(pending){onRetry();return}setSubmitted(true);void onBuy(detail.id,count)}}>{busy?'구매 중…':pending?'결과 확인':<><GoldIcon className="size-4 shrink-0"/><span className="tabular-nums">{total.toLocaleString('ko-KR')}</span> 구매</>}</Button></div>
    {maxQuantity<1&&<p className="mt-2 text-center text-xs text-muted-foreground">골드가 부족해요.</p>}
   </div></>}
  </DialogContent></Dialog>
 </section>
}
