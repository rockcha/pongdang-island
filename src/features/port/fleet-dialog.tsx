import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import type {HarborAction,HarborState} from './api'
import {BoatSprite} from './boat-sprite'

export function FleetDialog({open,onOpenChange,state,slot,onSlotChange,disabled,onRequest}:{open:boolean;onOpenChange:(open:boolean)=>void;state:HarborState|null;slot:number|null;onSlotChange:(slot:number)=>void;disabled:boolean;onRequest:(kind:'dock'|'store',extras:Partial<HarborAction>)=>void}){
 const occupied=state?.boats.find(b=>b.dock_slot===slot)
 const reserved=!!occupied&&!!state?.voyages.some(v=>v.boat_id===occupied.id)
 function request(kind:'dock'|'store',extras:Partial<HarborAction>){onOpenChange(false);onRequest(kind,extras)}
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[85dvh] max-w-sm flex-col overflow-hidden rounded-2xl"><DialogHeader><DialogTitle className="text-base font-normal">보유한 배</DialogTitle><DialogDescription>선착장에는 두 척까지 배치할 수 있어요. 조업 중인 배의 자리는 귀항과 수확을 마칠 때까지 유지돼요.</DialogDescription></DialogHeader>
  <div className="grid shrink-0 grid-cols-2 gap-2">{[1,2].map(n=>{const b=state?.boats.find(b=>b.dock_slot===n),away=!!b&&state?.voyages.some(v=>v.boat_id===b.id);return <Button key={n} variant={slot===n?'default':'secondary'} className="min-h-11 text-xs" disabled={disabled} aria-pressed={slot===n} onClick={()=>onSlotChange(n)}>{n}번 선착장{away?' · 사용 중':''}</Button>})}</div>
  {reserved&&<p role="status" className="rounded-xl bg-secondary p-3 text-xs leading-5 text-primary">출항한 배가 돌아올 자리예요. 조업 결과를 수확한 뒤 교체할 수 있어요.</p>}
  <div className="min-h-0 overflow-y-auto overscroll-contain divide-y">{state?.boats.map(b=>{
   const active=state.voyages.some(v=>v.boat_id===b.id)
   return <div key={b.id} className="flex items-center gap-3 py-3"><BoatSprite src={b.sprite_path} name={b.name} animate={false} className="w-20 shrink-0"/><div className="min-w-0 flex-1"><p className="text-xs">{b.name} {b.instance_no}호</p><p className="mt-1 text-[10px] text-muted-foreground">{active?'조업 중 또는 수확 대기':b.dock_slot?`${b.dock_slot}번 선착장`:'보관 중'}</p></div>{b.dock_slot?<Button variant="secondary" className="min-h-10 shrink-0 text-xs" disabled={disabled||active} onClick={()=>request('store',{p_boat_id:b.id})} aria-label={`${b.name} ${b.instance_no}호 보관`}>보관</Button>:<Button className="min-h-10 shrink-0 text-xs" disabled={disabled||slot===null||reserved} onClick={()=>request('dock',{p_boat_id:b.id,p_slot:slot!})} aria-label={`${b.name} ${b.instance_no}호 배치`}>{slot?'배치':'자리 선택'}</Button>}</div>
  })}{state?.boats.length===0&&<p className="py-8 text-center text-xs text-muted-foreground">조선소에서 배를 구매해 주세요.</p>}</div>
 </DialogContent></Dialog>
}
