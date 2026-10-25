import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import type {HarborAction,HarborVoyage} from './api'

export function canRefundVoyage(voyage:HarborVoyage,now:number){return now<=Date.parse(voyage.departed_at)+30000}

export function CancelVoyageButton({voyage,now,disabled,onRequest}:{voyage:HarborVoyage;now:number;disabled:boolean;onRequest:(args:Partial<HarborAction>)=>void}){
 if(Date.parse(voyage.returns_at)<=now)return null
 const refund=canRefundVoyage(voyage,now)
 return <Button variant="ghost" className="min-h-11 rounded-xl text-xs text-muted-foreground" disabled={disabled} onClick={()=>onRequest({p_voyage_id:voyage.id,p_refund_expected:refund})}>{refund?'출항 취소 · 연료 반환':'긴급 귀항'}</Button>
}

export function CancelVoyageDialog({request,voyage,now,busy,error,onOpenChange,onConfirm}:{request:HarborAction|null;voyage?:HarborVoyage;now:number;busy:boolean;error:string;onOpenChange:(open:boolean)=>void;onConfirm:()=>void}){
 const refund=request?.p_refund_expected
 const returned=!!voyage&&Date.parse(voyage.returns_at)<=now
 const expired=!!refund&&!!voyage&&!canRefundVoyage(voyage,now)
 return <ConfirmDialog open={request?.p_action==='cancel'} onOpenChange={onOpenChange} illustration="return" title={refund?'출항을 취소할까요?':'조업을 중단하고 돌아올까요?'}
  description={<span className="block space-y-2"><span className="block">배는 즉시 항구로 돌아와요. 이번 어획물은 받을 수 없어요.</span><span className="block">{refund?`출항 후 30초 이내에는 사용한 연료 ${voyage?.vessel_snapshot.fuel_cost??0}개를 돌려받아요.`:'사용한 연료는 돌려받지 못해요.'}</span>{returned&&<span className="block text-primary">이미 돌아온 배예요. 닫고 어획물을 수령해 주세요.</span>}{expired&&!returned&&<span className="block text-primary">30초가 지났어요. 닫고 긴급 귀항 조건을 다시 확인해 주세요.</span>}</span>}
  busy={busy} error={error} confirmDisabled={returned||expired} cancelLabel="계속 조업" confirmLabel={refund?'출항 취소':'귀항시키기'} onConfirm={onConfirm}/>
}
