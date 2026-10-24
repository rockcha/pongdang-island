import {useRef,useState} from 'react'
import {Plus} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {GoldIcon} from '@/features/gold/gold-provider'
import {randomId} from '@/lib/random-id'
import {capacityExpansionError,type AquariumState} from './api'

type Purchase={capacity:number;price:number;operation:string}
type Props={state:AquariumState;count:number;gold:number;busy:boolean;onExpand:(capacity:number,operation:string)=>Promise<void>}
function readPending(key:string):Purchase|null{
 try{const p=JSON.parse(localStorage.getItem(key)??'null');return p&&[70,100].includes(p.capacity)&&typeof p.operation==='string'&&Number.isFinite(p.price)?p:null}catch{return null}
}
export function AquariumCapacityExpansion(props:Props){
 const {session}=useAuth(),key=`pongdang:aquarium-expansion:${session?.user.id??'guest'}`
 return <CapacityExpansion key={key} storageKey={key} {...props}/>
}
function CapacityExpansion({state,count,gold,busy,onExpand,storageKey:key}:Props&{storageKey:string}){
 const [pending,setPending]=useState<Purchase|null>(()=>readPending(key))
 const [purchase,setPurchase]=useState<Purchase|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState('')
 const lock=useRef(false),next=state.nextCapacityExpansion
 function remember(p:Purchase|null){setPending(p);try{if(p)localStorage.setItem(key,JSON.stringify(p));else localStorage.removeItem(key)}catch{/* The in-memory request remains retryable. */}}
 async function confirm(){
  if(!purchase||busy||lock.current)return
  lock.current=true;setSaving(true);setError('');remember(purchase)
  try{await onExpand(purchase.capacity,purchase.operation);remember(null);setPurchase(null)}
  catch(cause){setError(capacityExpansionError(cause));if((cause as {code?:string}).code)remember(null)}
  finally{lock.current=false;setSaving(false)}
 }
 return <>
  <button type="button" aria-label={pending?'어항 확장 결과 확인':next?`어항 수용량 ${state.tankCapacity}개, 모든 어항 ${next.capacity}개로 확장`:`어항 수용량 ${state.tankCapacity}개, 최대 확장 완료`} disabled={busy||saving||!next&&!pending} onClick={()=>{setError('');setPurchase(pending??(next?{...next,operation:randomId()}:null))}} className="flex min-h-11 shrink-0 flex-col items-center justify-center rounded-lg px-1.5 text-primary hover:bg-background/30 disabled:opacity-70">
   <span className="text-[11px] tabular-nums">{count} / {state.tankCapacity}</span>
   <span className="flex items-center gap-0.5 text-[9px]">{pending?'결과 확인':next?<><Plus aria-hidden="true" className="size-2.5"/>수용량 확장</>:'최대 확장'}</span>
  </button>
  <ConfirmDialog open={!!purchase} onOpenChange={open=>{if(!saving&&!open)setPurchase(null)}} illustration="aquarium" title={`모든 어항의 제한을 ${purchase?.capacity??state.tankCapacity}으로 확장할까요?`} description={<span className="block space-y-3"><span className="flex items-center justify-center gap-2 text-base text-primary"><GoldIcon className="size-6"/>{purchase?.price.toLocaleString('ko-KR')}</span><span className="block">보유한 모든 어항과 앞으로 추가할 어항에 영구 적용돼요.</span><span className="block text-[11px] text-muted-foreground">물고기·장식물·쓰레기를 합한 수용량이에요.</span>{!pending&&gold<(purchase?.price??0)&&<span className="block text-destructive">골드가 부족해요.</span>}</span>} busy={saving} confirmDisabled={busy||!pending&&gold<(purchase?.price??0)} error={error} confirmLabel={pending?'결과 다시 확인':'확장하기'} onConfirm={()=>void confirm()}/>
 </>
}
