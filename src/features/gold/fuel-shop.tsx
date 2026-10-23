import {useState} from 'react'
import {appArt} from '@/components/app-art'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {useHarbor} from '@/features/port/use-harbor'
import type {HarborAction} from '@/features/port/api'
import {randomId} from '@/lib/random-id'
import {GoldIcon,useGold} from './gold-provider'

export function FuelShop(){
 const harbor=useHarbor(),{wallet}=useGold()
 const {state,busy,pending,error}=harbor
 const [quantity,setQuantity]=useState(1),[confirm,setConfirm]=useState<HarborAction|null>(null)
 const remaining=Math.max(0,(state?.fuelDailyLimit??5)-(state?.fuelPurchasedToday??0)),price=state?.fuelPrice??57
 async function purchase(args:HarborAction){if(await harbor.run(args))setConfirm(null)}
 return <div className="space-y-5 p-5">
  <div className="flex items-center gap-4"><appArt.fuel className="size-20"/><div><h2 className="text-base">연료</h2><p className="mt-1 text-xs text-muted-foreground">배를 출항할 때 사용해요.</p><p className="mt-2 text-sm text-primary">보유 {state?.fuel??'…'}통</p></div></div>
  <div className="rounded-xl bg-secondary/40 p-4"><p className="text-sm">오늘 {remaining}통 구매 가능</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">하루 최대 5통 · 한국 시간 자정 초기화</p></div>
  <div className="flex items-center gap-2"><Input aria-label="구매할 연료 수량" type="number" min={1} max={Math.max(1,remaining)} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(Math.max(1,remaining),Math.floor(Number(e.target.value))||1)))}/>{[1,3,5].filter(n=>n<=remaining).map(n=><Button key={n} variant="secondary" className="min-h-11" onClick={()=>setQuantity(n)}>{n}개</Button>)}</div>
  <Button className="min-h-12 w-full rounded-xl" disabled={!state||busy||!!pending||remaining===0||quantity>remaining||wallet.gold<quantity*price} onClick={()=>setConfirm({p_action:'fuel',p_operation_id:randomId(),p_quantity:quantity})}><GoldIcon className="size-5"/>{(quantity*price).toLocaleString('ko-KR')} 골드로 구매</Button>
  {(error||pending)&&!confirm&&<div role="alert" className="space-y-2 text-xs"><p>{error||'이전 요청 결과를 확인해 주세요.'}</p><Button variant="outline" disabled={busy} onClick={()=>pending?void purchase(pending):void harbor.reload()}>요청 결과 다시 확인</Button></div>}
  <ConfirmDialog open={!!confirm} onOpenChange={open=>{if(!open&&!pending)setConfirm(null)}} illustration="purchase" title={`연료 ${confirm?.p_quantity??quantity}개를 채울까요?`} description={`${(confirm?.p_quantity??quantity)*price}골드가 소모돼요.`} busy={busy} error={error} onConfirm={()=>{if(confirm)void purchase(pending??confirm)}}/>
 </div>
}
