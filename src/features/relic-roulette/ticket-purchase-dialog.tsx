import {Minus,Plus,Ticket} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'

const number=(value:number)=>value.toLocaleString('ko-KR')
export function TicketPurchaseDialog({open,onOpenChange,gold,price,quantity,onQuantity,onPurchase,busy,pending,error}:{
 open:boolean;onOpenChange:(open:boolean)=>void;gold:number;price:number;quantity:string;onQuantity:(value:string)=>void;onPurchase:()=>void;busy:boolean;pending:boolean;error:string
}){
 const count=Number(quantity),valid=/^\d+$/.test(quantity)&&Number.isSafeInteger(count)&&count>0&&count<=1000,total=count*price,affordable=Math.floor(gold/price)
 return <Dialog open={open} onOpenChange={value=>{if(!busy)onOpenChange(value)}}><DialogContent showCloseButton={!busy} className="roulette-ticket-dialog rounded-2xl sm:max-w-sm">
  <DialogHeader><span className="roulette-ticket-symbol"><Ticket size={25} strokeWidth={1.5}/></span><DialogTitle>룰렛 이용권</DialogTitle><DialogDescription>미리 구매하고, 원할 때 한 장씩 사용해요.</DialogDescription></DialogHeader>
  <div className="roulette-ticket-price"><span>1장</span><strong>{number(price)}골드</strong></div>
  <label className="sr-only" htmlFor="roulette-ticket-quantity">구매 수량</label>
  <div className="roulette-ticket-stepper"><Button type="button" variant="ghost" size="icon" aria-label="이용권 1장 줄이기" disabled={busy||pending||!valid||count<=1} onClick={()=>onQuantity(String(count-1))}><Minus size={18}/></Button><div><Input id="roulette-ticket-quantity" type="text" inputMode="numeric" pattern="[0-9]*" value={quantity} disabled={busy||pending} aria-invalid={!valid||(!pending&&total>gold)} aria-describedby="roulette-ticket-help" onChange={event=>{if(/^\d*$/.test(event.target.value))onQuantity(event.target.value)}}/><span>장</span></div><Button type="button" variant="ghost" size="icon" aria-label="이용권 1장 늘리기" disabled={busy||pending||!valid||count>=Math.min(1000,affordable)} onClick={()=>onQuantity(String(count+1))}><Plus size={18}/></Button></div>
  <div className="roulette-ticket-presets">{[1,5,10].map(value=><button type="button" key={value} aria-pressed={count===value} disabled={busy||pending||value>affordable} onClick={()=>onQuantity(String(value))}>{value}장</button>)}</div>
  <div className="roulette-ticket-total"><p><span>총 구매 금액</span><strong>{valid?number(total):'—'}골드</strong></p><p><span>보유 골드</span><span>{number(gold)}골드</span></p></div>
  <p id="roulette-ticket-help" className="text-balance text-center text-[11px] leading-5 text-muted-foreground">유효기간 없음 · 구매 후 자동으로 돌아가지 않아요.</p>
  {error?<p className="roulette-error" role="alert">{error}</p>:valid&&!pending&&total>gold?<p className="roulette-error" role="alert">보유 골드가 부족해요.</p>:null}
  <Button type="button" className="min-h-12 rounded-xl text-xs" disabled={busy||!valid||(!pending&&total>gold)} onClick={onPurchase}>{busy?'구매 결과를 확인하고 있어요…':pending?'같은 구매 다시 확인':valid?`${number(count)}장 구매하기`:'수량을 입력해 주세요'}</Button>
 </DialogContent></Dialog>
}
