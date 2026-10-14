import { useRef,useState } from 'react'
import { Gift,Send } from 'lucide-react'
import { toast } from 'sonner'
import { useSocial } from '@/features/social/social-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger } from '@/components/ui/dialog'
import type { OwnedCollectible,Species } from '@/features/collection/api'
import { giftError,sendGift } from './api'

export function SendGiftDialog({species,items,disabled,onSent}:{species:Species;items:OwnedCollectible[];disabled:boolean;onSent:(ids:string[])=>void}){
 const {owner,requests,refresh}=useSocial()
 const [open,setOpen]=useState(false),[recipient,setRecipient]=useState(''),[quantity,setQuantity]=useState(1),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const locked=useRef(false),pending=useRef<{signature:string;id:string}|null>(null)
 const friends=requests.filter(request=>request.status==='accepted').map(request=>request.sender_id===owner?request.recipient:request.sender).filter(Boolean)
 const available=items.filter(item=>!item.id.startsWith('test-'))
 const valid=friends.some(friend=>friend.id===recipient)&&Number.isInteger(quantity)&&quantity>=1&&quantity<=Math.min(20,available.length)&&message.length<=300
 async function send(){
  if(!valid||locked.current)return
  const ids=available.slice(0,quantity).map(item=>item.id).sort(),signature=JSON.stringify([recipient,ids,message.trim()])
  if(pending.current&&pending.current.signature!==signature){setError('이전 요청과 같은 친구·수량·메모로 다시 보내주세요.');return}
  pending.current??={signature,id:crypto.randomUUID()};locked.current=true;setBusy(true);setError('')
  try{await sendGift(recipient,ids,message,pending.current.id);pending.current=null;onSent(ids);setOpen(false);setMessage('');setQuantity(1);toast.success('선물을 보냈어요.');void refresh()}
  catch(cause){if(/^[0-9A-Z]{5}$/.test(String((cause as {code?:string})?.code)))pending.current=null;setError(giftError(cause))}
  finally{locked.current=false;setBusy(false)}
 }
 return <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value)}}>
  <DialogTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`${species.name} 선물`} disabled={disabled||!available.length}/> }><Gift className="size-4"/></DialogTrigger>
  <DialogContent className="sm:max-w-sm" showCloseButton={!busy}><DialogHeader><DialogTitle>선물 보내기</DialogTitle><DialogDescription>{species.name} · 실제 보유 {available.length}개</DialogDescription></DialogHeader>
   {!friends.length?<p className="py-4 text-sm text-muted-foreground">친구를 먼저 만나보세요. 친구에게 선물을 보낼 수 있어요.</p>:<div className="space-y-4">
    <div className="space-y-2"><Label htmlFor="gift-recipient">받는 친구</Label><select id="gift-recipient" className="h-10 w-full rounded-md border bg-background px-3" value={recipient} disabled={busy} onChange={event=>setRecipient(event.target.value)}><option value="">친구 선택</option>{friends.map(friend=><option key={friend.id} value={friend.id}>{friend.nickname} · {friend.friend_code}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor="gift-quantity">수량</Label><Input id="gift-quantity" type="number" min={1} max={Math.min(20,available.length)} value={quantity} disabled={busy} onChange={event=>setQuantity(Number(event.target.value))}/></div>
    <div className="space-y-2"><Label htmlFor="gift-message">메모 <span className="text-xs text-muted-foreground">선택</span></Label><textarea id="gift-message" className="min-h-24 w-full resize-none rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={300} value={message} disabled={busy} onChange={event=>setMessage(event.target.value)} placeholder="친구에게 전하고 싶은 말을 적어주세요."/><p className="text-right text-xs tabular-nums text-muted-foreground">{message.length} / 300</p></div>
    <p className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">{friends.find(friend=>friend.id===recipient)?.nickname??'친구'}님에게 {species.name} ×{quantity}를 보냅니다. 보낸 개체는 내 어항에서 빠지며 취소할 수 없어요.</p>
   </div>}
   {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
   <Button disabled={!valid||busy} onClick={()=>void send()}><Send className="size-4"/>{busy?'보내는 중…':'선물 보내기'}</Button>
  </DialogContent>
 </Dialog>
}
