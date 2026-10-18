import { useRef,useState } from 'react'
import { Check,Gift,MessageSquarePlus,Search,Send } from 'lucide-react'
import { toast } from 'sonner'
import { useSocial } from '@/features/social/social-provider'
import {Input} from '@/components/ui/input'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import { Button } from '@/components/ui/button'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import { Label } from '@/components/ui/label'
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger } from '@/components/ui/dialog'
import type { OwnedCollectible,Species } from '@/features/collection/api'
import { giftError,sendGift } from './api'

export function SendGiftDialog({species,items,disabled,onSent}:{species:Species;items:OwnedCollectible[];disabled:boolean;onSent:(ids:string[])=>void}){
 const {owner,requests,refresh}=useSocial()
 const [open,setOpen]=useState(false),[recipient,setRecipient]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [friendQuery,setFriendQuery]=useState(''),[memoOpen,setMemoOpen]=useState(false),[memoFocused,setMemoFocused]=useState(false)
 const locked=useRef(false),pending=useRef<{signature:string;id:string}|null>(null)
 const friends=requests.filter(request=>request.status==='accepted').map(request=>request.sender_id===owner?request.recipient:request.sender).filter(Boolean)
 const filteredFriends=friends.filter(friend=>friend.nickname.toLocaleLowerCase().includes(friendQuery.trim().toLocaleLowerCase()))
 const chosenFriend=friends.find(friend=>friend.id===recipient)
 const available=items.filter(item=>!item.id.startsWith('test-'))
 const quantity=available.length
 const valid=friends.some(friend=>friend.id===recipient)&&Number.isInteger(quantity)&&quantity>=1&&quantity<=Math.min(20,available.length)&&message.length<=300
 async function send(){
  if(!valid||locked.current)return
  const ids=available.slice(0,quantity).map(item=>item.id).sort(),signature=JSON.stringify([recipient,ids,message.trim()])
  if(pending.current&&pending.current.signature!==signature){setError('이전 요청과 같은 친구·수량·메모로 다시 보내주세요.');return}
  pending.current??={signature,id:crypto.randomUUID()};locked.current=true;setBusy(true);setError('')
  try{await sendGift(recipient,ids,message,pending.current.id);pending.current=null;onSent(ids);setOpen(false);setMessage('');setMemoOpen(false);setFriendQuery('');setRecipient('');toast.success('선물을 보냈어요.');void refresh()}
  catch(cause){if(/^[0-9A-Z]{5}$/.test(String((cause as {code?:string})?.code)))pending.current=null;setError(giftError(cause))}
  finally{locked.current=false;setBusy(false)}
 }
 return <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value)}}>
  <DialogTrigger render={<Button variant="secondary" className="h-16 w-full min-w-0 rounded-none border-r" aria-label={`${species.name} 선물`} disabled={disabled||!available.length||available.length>20}/> }><Gift className="size-5"/></DialogTrigger>
  <DialogContent className="bottom-0 top-auto left-0 flex max-h-[85dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-4 overflow-y-auto rounded-t-2xl rounded-b-none pb-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl" showCloseButton={!busy}><DialogHeader><DialogTitle>선물 보내기</DialogTitle><DialogDescription>선택한 개체를 친구에게 보내요.</DialogDescription></DialogHeader><div className="flex items-center gap-3 rounded-xl border bg-secondary/30 p-3"><CollectibleThumbnail species={species} path={species.thumbnail_path} name={species.name} className="size-14 shrink-0"/><div className="min-w-0"><p className="truncate text-sm">{species.name}</p><p className="mt-1 text-xs text-primary">×{quantity}</p></div></div>
   {!friends.length?<p className="py-4 text-sm text-muted-foreground">친구를 먼저 만나보세요. 친구에게 선물을 보낼 수 있어요.</p>:<div className="space-y-4">
    <div className="space-y-2"><p id="gift-recipient-label" className="text-sm">받는 친구</p><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input aria-label="친구 검색" placeholder="친구 검색" className="min-h-11 rounded-xl bg-secondary/30 pl-9 text-base" value={friendQuery} disabled={busy} onChange={event=>setFriendQuery(event.target.value)}/></div>
     <div role="group" aria-labelledby="gift-recipient-label" className="h-44 space-y-1 overflow-y-auto overscroll-contain">{filteredFriends.map(friend=><button key={friend.id} type="button" aria-pressed={recipient===friend.id} aria-label={friend.nickname+' 선택'} disabled={busy} onClick={()=>setRecipient(friend.id)} className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${recipient===friend.id?'border-primary bg-secondary/60':'border-transparent hover:bg-muted'}`}><PlayerAvatar nickname={friend.nickname} path={friend.avatar_path} className="size-9 shrink-0"/><span className="min-w-0 flex-1 truncate text-sm">{friend.nickname}</span>{recipient===friend.id&&<Check aria-hidden="true" className="size-4 shrink-0 text-primary"/>}</button>)}{!filteredFriends.length&&<p role="status" className="py-8 text-center text-xs text-muted-foreground">검색한 친구가 없어요.</p>}</div>
     {chosenFriend&&<p className="text-xs text-primary" aria-live="polite">{chosenFriend.nickname} 선택됨</p>}
    </div>
    <div>{!memoOpen?<Button variant="ghost" className="min-h-11 gap-2 px-1 text-xs text-muted-foreground" disabled={busy} onClick={()=>setMemoOpen(true)}><MessageSquarePlus className="size-4"/>메모 추가</Button>:<div className="space-y-1.5"><div className="flex items-center justify-between"><Label htmlFor="gift-message" className="text-xs text-muted-foreground">메모</Label><Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled={busy} onClick={()=>setMemoOpen(false)}>접기</Button></div><textarea autoFocus id="gift-message" className="min-h-24 w-full resize-none rounded-xl border border-border bg-secondary/30 p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40" maxLength={300} value={message} disabled={busy} onFocus={()=>setMemoFocused(true)} onBlur={()=>setMemoFocused(false)} onChange={event=>setMessage(event.target.value)} placeholder="짧은 마음을 함께 전해보세요."/>{memoFocused&&<p className="text-right text-[10px] tabular-nums text-muted-foreground">{message.length}/300</p>}</div>}</div>
   </div>}
   {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
   <Button className="-mx-4 -mb-4 min-h-16 shrink-0 rounded-none" disabled={!valid||busy} onClick={()=>void send()}><Send className="size-4"/>{busy?'보내는 중…':'선물 보내기'}</Button>
  </DialogContent>
 </Dialog>
}
