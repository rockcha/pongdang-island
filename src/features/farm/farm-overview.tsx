import {useState} from 'react'
import {ClipboardList,Clock3,PackageCheck,TriangleAlert} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {farmGoods} from './farm-simulation'
import {goodsForDelivery} from './market-catalog'
import {FarmGoodIcon} from './farm-good-icon'
import {TopviewArt} from './topview-art'
import {farmOverview,farmRemainingTime} from './farm-overview-model'
import {topviewItems,type TopviewState} from './topview-model'

export function FarmOverview({state,now,onClose}:{state:TopviewState;now:number;onClose:()=>void}){
 const [tab,setTab]=useState<'production'|'orders'>('production'),[filter,setFilter]=useState<'all'|'ready'|'working'>('all')
 const overview=farmOverview(state,now),tasks=overview.tasks.filter(task=>filter==='all'||task.status===filter)
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="farm-sim-dialog farm-overview">
  <DialogHeader><span className="farm-overview-eyebrow"><ClipboardList size={15}/>한눈에 살펴보기</span><DialogTitle>농장 현황</DialogTitle><DialogDescription>생산과 요리 납품 현황을 확인해요.</DialogDescription></DialogHeader>
  <nav className="farm-overview-tabs" aria-label="농장 현황 분류"><button aria-pressed={tab==='production'} onClick={()=>setTab('production')}>생산 현황 <span>{overview.tasks.length}</span></button><button aria-pressed={tab==='orders'} onClick={()=>setTab('orders')}>납품 현황 <span>{goodsForDelivery(state.simulation.inventory).length}</span></button></nav>
  {tab==='production'?<>
   <div className="farm-overview-filters" role="group" aria-label="생산 상태 필터">{([{id:'all',label:'전체',count:overview.tasks.length},{id:'ready',label:'수령 가능',count:overview.ready},{id:'working',label:'진행 중',count:overview.working}] as const).map(item=><button key={item.id} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}</div>
   {overview.attention>0&&<p className="farm-overview-warning"><TriangleAlert size={14}/>정리가 필요한 밭 {overview.attention}곳 · 전체 목록에서 확인해요</p>}
   {overview.blocked>0&&<p className="farm-overview-warning"><TriangleAlert size={14}/>창고 보관 대기 {overview.blocked}건 · 전체 목록에서 확인해요</p>}
   <div className="farm-overview-list" aria-label="생산 작업 목록">{tasks.map(task=>{
    const object=state.objects.find(o=>o.id===task.objectId)!,status=task.status==='ready'?'수령 가능':task.status==='attention'?'정리 필요':task.status==='blocked'?'보관 대기':farmRemainingTime(task.readyAt,now)
    const Icon=task.status==='ready'?PackageCheck:task.status==='attention'||task.status==='blocked'?TriangleAlert:Clock3
    return <div key={task.id} className="farm-overview-task" data-status={task.status} aria-label={`${task.title} · ${topviewItems[object.kind].name} (${object.x},${object.y})`}>
     <span className="farm-overview-art">{task.good?<FarmGoodIcon good={task.good}/>:<TopviewArt kind={object.kind}/>}</span>
     <span className="farm-overview-task-copy"><strong>{task.title}{task.quantity!==undefined&&<small> ×{task.quantity}</small>}</strong><span>{topviewItems[object.kind].name} · {object.x}, {object.y}</span>{task.detail&&<small>{task.detail}</small>}<span className="farm-overview-status"><Icon size={13}/>{status}</span></span>
    </div>
   })}{!tasks.length&&<div className="farm-overview-empty"><Clock3 size={25}/><strong>{filter==='ready'?'아직 수령할 생산물이 없어요':filter==='working'?'진행 중인 작업이 없어요':'지금은 쉬고 있는 농장이에요'}</strong><p>밭에 씨앗을 심거나 시설에서 생산을 시작하면 여기에 표시돼요.</p></div>}</div>
  </>:<div className="farm-overview-list" aria-label="요리 납품소 납품 현황">
   <p className="farm-overview-note">완성한 음식을 요리 납품소에 납품하고 골드를 받을 수 있어요.</p>
   {state.objects.filter(o=>o.kind==='store').map(object=><section key={object.id} className="farm-overview-orders">
    <div className="farm-overview-store"><span><strong>요리 납품소</strong><small>{object.x}, {object.y} · 납품 가능한 음식 {goodsForDelivery(state.simulation.inventory).length}종</small></span></div>
    <div>{goodsForDelivery(state.simulation.inventory).map(good=><article key={good} className="farm-overview-order"><div className="farm-overview-order-main"><FarmGoodIcon good={good}/><span><strong>{farmGoods[good].name}</strong><small>보유 {state.simulation.inventory[good]}개</small></span><span className="farm-overview-order-state">개당 {farmGoods[good].price} G</span></div></article>)}</div>
   </section>)}
   {!state.objects.some(o=>o.kind==='store')&&<div className="farm-overview-empty"><ClipboardList size={25}/><strong>배치된 요리 납품소가 없어요</strong><p>보관함에서 기본 제공 요리 납품소를 꺼내 배치해주세요.</p></div>}
  </div>}
 </DialogContent></Dialog>
}
