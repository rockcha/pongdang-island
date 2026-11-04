import {useState} from 'react'
import {ArrowUpRight,Check,ClipboardList,Clock3,PackageCheck,TriangleAlert} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {farmGoods} from './farm-simulation'
import {FarmGoodIcon} from './farm-good-icon'
import {TopviewArt} from './topview-art'
import {farmOverview,farmRemainingTime} from './farm-overview-model'
import {topviewItems,type TopviewState} from './topview-model'

export function FarmOverview({state,now,onClose,onVisit}:{state:TopviewState;now:number;onClose:()=>void;onVisit:(id:number)=>void}){
 const [tab,setTab]=useState<'production'|'orders'>('production'),[filter,setFilter]=useState<'all'|'ready'|'working'>('all')
 const overview=farmOverview(state,now),tasks=overview.tasks.filter(task=>filter==='all'||task.status===filter)
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="farm-sim-dialog farm-overview">
  <DialogHeader><span className="farm-overview-eyebrow"><ClipboardList size={15}/>한눈에 살펴보기</span><DialogTitle>농장 현황</DialogTitle><DialogDescription>진행 상황을 확인하고, 항목을 누르면 해당 시설로 이동해요.</DialogDescription></DialogHeader>
  <nav className="farm-overview-tabs" aria-label="농장 현황 분류"><button aria-pressed={tab==='production'} onClick={()=>setTab('production')}>생산 현황 <span>{overview.tasks.length}</span></button><button aria-pressed={tab==='orders'} onClick={()=>setTab('orders')}>오늘의 주문 <span>{overview.orders.filter(order=>!order.complete).length}</span></button></nav>
  {tab==='production'?<>
   <div className="farm-overview-filters" role="group" aria-label="생산 상태 필터">{([{id:'all',label:'전체',count:overview.tasks.length},{id:'ready',label:'수령 가능',count:overview.ready},{id:'working',label:'진행 중',count:overview.working}] as const).map(item=><button key={item.id} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}</div>
   {overview.attention>0&&<p className="farm-overview-warning"><TriangleAlert size={14}/>정리가 필요한 밭 {overview.attention}곳 · 전체 목록에서 확인해요</p>}
   {overview.blocked>0&&<p className="farm-overview-warning"><TriangleAlert size={14}/>창고 보관 대기 {overview.blocked}건 · 전체 목록에서 확인해요</p>}
   <div className="farm-overview-list" aria-label="생산 작업 목록">{tasks.map(task=>{
    const object=state.objects.find(o=>o.id===task.objectId)!,status=task.status==='ready'?'수령 가능':task.status==='attention'?'정리 필요':task.status==='blocked'?'보관 대기':farmRemainingTime(task.readyAt,now)
    const Icon=task.status==='ready'?PackageCheck:task.status==='attention'||task.status==='blocked'?TriangleAlert:Clock3
    return <button key={task.id} className="farm-overview-task" data-status={task.status} aria-label={`${task.title} · ${topviewItems[object.kind].name} (${object.x},${object.y})으로 이동`} onClick={()=>onVisit(object.id)}>
     <span className="farm-overview-art">{task.good?<FarmGoodIcon good={task.good}/>:<TopviewArt kind={object.kind}/>}</span>
     <span className="farm-overview-task-copy"><strong>{task.title}{task.quantity!==undefined&&<small> ×{task.quantity}</small>}</strong><span>{topviewItems[object.kind].name} · {object.x}, {object.y}</span>{task.detail&&<small>{task.detail}</small>}<span className="farm-overview-status"><Icon size={13}/>{status}</span></span><ArrowUpRight size={17}/>
    </button>
   })}{!tasks.length&&<div className="farm-overview-empty"><Clock3 size={25}/><strong>{filter==='ready'?'아직 수령할 생산물이 없어요':filter==='working'?'진행 중인 작업이 없어요':'지금은 쉬고 있는 농장이에요'}</strong><p>밭에 씨앗을 심거나 시설에서 생산을 시작하면 여기에 표시돼요.</p></div>}</div>
  </>:<div className="farm-overview-list" aria-label="판매소별 주문 목록">
   <p className="farm-overview-note">부족 수량은 현재 창고 재고를 기준으로 판매소마다 계산해요. 매일 한국 시간 00:00에 주문이 바뀌어요.</p>
   {overview.orders.map(({object,items,locked,warehouseReady,complete})=><section key={object.id} className="farm-overview-orders" aria-label={`${topviewItems[object.kind].name} (${object.x},${object.y}) 주문`}>
    <button className="farm-overview-store" aria-label={`${topviewItems[object.kind].name} (${object.x},${object.y})으로 이동`} onClick={()=>onVisit(object.id)}><span><strong>{topviewItems[object.kind].name}</strong><small>{object.x}, {object.y} · {locked?'업그레이드 중':complete?'오늘의 주문 완료':!warehouseReady?'창고 사용 대기':`${items.filter(item=>item.remaining>0).length}종 주문 남음`}</small></span><ArrowUpRight size={17}/></button>
    <div>{items.map(item=><article key={item.good} className="farm-overview-order" data-complete={!item.remaining}>
     <button className="farm-overview-order-main" aria-label={`${farmGoods[item.good].name} 주문 · ${topviewItems[object.kind].name} (${object.x},${object.y})으로 이동`} onClick={()=>onVisit(object.id)}><FarmGoodIcon good={item.good}/><span><strong>{farmGoods[item.good].name}</strong><small>{item.remaining?`남은 주문 ${item.remaining}개 · 보유 ${item.owned}개`:'납품 완료'}</small></span>{!item.remaining?<span className="farm-overview-order-state"><Check size={14}/>완료</span>:<span className="farm-overview-order-state" data-missing={item.missing>0||!warehouseReady||locked}>{item.missing?`${item.missing}개 부족`:!warehouseReady||locked?'납품 대기':`${item.deliverable}개 납품 가능`}</span>}</button>
     {item.ingredients.length>0&&<p className="farm-overview-materials">{item.ingredients.some(ingredient=>ingredient.missing>0)?`만들 재료 부족 · ${item.ingredients.filter(ingredient=>ingredient.missing>0).map(ingredient=>`${farmGoods[ingredient.good].name} ${ingredient.missing}개`).join(' · ')}`:'만들 재료가 모두 준비됐어요.'}</p>}
    </article>)}</div>
   </section>)}
   {!overview.orders.length&&<div className="farm-overview-empty"><ClipboardList size={25}/><strong>배치된 판매소가 없어요</strong><p>판매소를 배치하면 오늘의 주문을 확인할 수 있어요.</p></div>}
  </div>}
 </DialogContent></Dialog>
}
