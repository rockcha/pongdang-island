import {EmptyState} from '@/components/empty-state'
import {NotificationSkeleton} from '@/features/notifications/notification-skeleton'
import {LandscapeImage} from '@/components/landscape-image'
import { useEffect,useRef,useState } from 'react'
import { BadgeCheck,Gift,ChevronLeft,ChevronRight,ArrowLeftRight,Package } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog'
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from '@/components/ui/tooltip'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import { useSocial } from '@/features/social/social-provider'
import { claimGift,giftError,giftReactions,loadGift,loadGifts,reactToGift } from './api'
import type { GiftMailbox as Mailbox,GiftRecord,GiftReaction } from './api'
import {markRelatedRead} from '@/features/notifications/api'
import {PlayerAvatar} from '@/features/profile/player-avatar'

function GiftPicture({gift,className}:{gift:GiftRecord;className:string}){
 if(gift.reward_kind==='gold')return <GoldIcon className={className}/>
 if(gift.reward_kind==='bait'||gift.reward_kind==='fuel')return <span className={`${className} relative inline-block shrink-0`}><LandscapeImage src={gift.species.thumbnail_path} alt="" className="absolute inset-0 size-full object-contain"/></span>
 return <CollectibleThumbnail fadeIn species={gift.species} path={gift.species.thumbnail_path} name={gift.species.name} className={className}/>
}

function GiftSender({gift,direction='received'}:{gift:GiftRecord;direction?:'received'|'sent'}){
 if(gift.source==='system')return <span className="inline-flex max-w-full items-center gap-1.5"><span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"><BadgeCheck className="size-3" aria-hidden="true"/>공식</span><span className="truncate">퐁당섬 운영팀에서 보내드렸어요</span></span>
 return <>{direction==='received'?`${gift.sender_name}님이 보낸 선물`:`${gift.recipient_name}님에게 보낸 선물`}</>
}

export function GiftMailbox({onOpen}:{onOpen:(id:string)=>void}){
 const {notifications}=useSocial()
 const [direction,setDirection]=useState<'received'|'sent'>('received'),[offset,setOffset]=useState(0),[mail,setMail]=useState<Mailbox|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;setMail(null);setError('');void loadGifts(direction,offset).then(data=>{if(active)setMail(data)}).catch(cause=>{if(active)setError(giftError(cause))});return()=>{active=false}},[direction,offset,notifications,retry])
 return <div className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="선물함"><div role="group" aria-label="선물 방향" className="segmented-control grid shrink-0 grid-cols-2 gap-0 border-b border-border bg-background">{([['received','받은 선물'],['sent','보낸 선물']] as const).map(([value,label])=><Button key={value} variant="ghost" aria-pressed={direction===value} className={`min-h-12 min-w-0 rounded-none border-r border-border ${direction===value?'bg-secondary text-primary':'text-muted-foreground'}`} onClick={()=>{setDirection(value);setOffset(0)}}>{label}</Button>)}</div><div key={direction} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
  {error?<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>다시 불러오기</Button></div>:!mail?<NotificationSkeleton label="선물을 불러오는 중…"/>:<>
   <ul className="divide-y">{mail.items.map(gift=><li key={gift.id}><button className={`my-2 flex w-full items-center gap-3 rounded-xl p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${gift.status==='pending'?'bg-secondary/65':'bg-muted/30 text-muted-foreground'}`} onClick={()=>onOpen(gift.id)}><GiftPicture gift={gift} className={`size-14 shrink-0 ${gift.status==='claimed'?'grayscale opacity-50':''}`}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{gift.species.name} <span className="text-xs text-muted-foreground">×{gift.quantity}</span></p><p className="mt-1 truncate text-xs text-muted-foreground"><GiftSender gift={gift} direction={direction}/></p></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${gift.status==='pending'?'bg-primary/15 font-semibold text-primary':'bg-muted text-muted-foreground'}`}>{gift.reaction&&<span className="mr-1">{giftReactions[gift.reaction].emoji}</span>}{gift.status==='claimed'?'수령 완료':gift.recipient_id===null?'수신자 탈퇴':'미수령'}</span></button></li>)}</ul>
   {!mail.items.length&&<EmptyState>{direction==='received'?'아직 도착한 선물이 없어요.':'아직 보낸 선물이 없어요.'}</EmptyState>}
   {mail.total>30&&<div className="flex items-center justify-between pt-3"><Button variant="ghost" size="icon" aria-label="이전 선물" disabled={offset===0} onClick={()=>setOffset(value=>Math.max(0,value-30))}><ChevronLeft/></Button><span className="text-xs tabular-nums text-muted-foreground">{offset+1}–{Math.min(offset+30,mail.total)} / {mail.total}</span><Button variant="ghost" size="icon" aria-label="다음 선물" disabled={offset+30>=mail.total} onClick={()=>setOffset(value=>value+30)}><ChevronRight/></Button></div>}
  </>}
 </div></div>
}

export function GiftDetailDialog({id,onClose}:{id:string|null;onClose:()=>void}){
 const gold=useGold()
 const {owner,refresh,notifications,requests,profile}=useSocial()
 const [gift,setGift]=useState<GiftRecord|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0)
 const locked=useRef(false),active=useRef(true)
 const confirmedReads=useRef(new Set<string>())
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 useEffect(()=>{let current=true;setGift(null);setError('');if(id)void loadGift(id).then(data=>{if(current)setGift(data)}).catch(cause=>{if(current)setError(giftError(cause))});return()=>{current=false}},[id,retry,notifications])
 useEffect(()=>{if(!gift||gift.status==='pending'||!owner||confirmedReads.current.has(gift.id))return;const giftId=gift.id;confirmedReads.current.add(giftId);void markRelatedRead(owner,'gift_id',giftId).then(()=>refresh()).catch(()=>{confirmedReads.current.delete(giftId);toast.error('선물 확인 상태를 저장하지 못했어요.')})},[gift?.id,gift?.status,owner,refresh])
 async function act(reaction?:GiftReaction){
  if(!gift||locked.current)return
  locked.current=true;setBusy(true);setError('')
  try{const data=reaction?await reactToGift(gift.id,reaction):await claimGift(gift.id);if(active.current)setGift({...data,species:{...data.species,...(gift.species.exchange_offer?{exchange_offer:gift.species.exchange_offer}:{})}});toast.success(reaction?'이모지 답장을 보냈어요.':gift.reward_kind==='gold'?'골드를 받았어요.':gift.reward_kind==='bait'?'미끼를 받았어요.':gift.reward_kind==='fuel'?'기름을 받았어요.':'선물을 받았어요. 아쿠아리움 보관함에서 만나보세요.');if(!reaction){void gold.refresh();window.dispatchEvent(new Event('fishing-rods-changed'))}void refresh()}
  catch(cause){if(active.current)setError(giftError(cause))}finally{locked.current=false;if(active.current)setBusy(false)}
 }
 const received=gift?.recipient_id===owner
 const sender=gift?.sender_id===owner?profile:requests?.flatMap(request=>[request.sender,request.recipient]).find(player=>player?.id===gift?.sender_id)
 const personal=gift&&(gift.source??'friend')==='friend'
 const traded=gift?.source==='exchange'&&gift.reward_kind==='gold'?gift.species.exchange_offer:undefined
 return <Dialog open={!!id} onOpenChange={value=>{if(!value&&!busy)onClose()}}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-sm" showCloseButton={!busy}>
  <DialogHeader><DialogTitle className="flex items-center gap-2 pr-6"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="size-6 shrink-0 object-contain"/>{gift?.source==='system'?'모험 응원 선물':gift?.source==='exchange'?'거래소 배송':'선물 이야기'}</DialogTitle><DialogDescription className={personal?'sr-only':undefined}>{gift&&(gift.source==='system'?<GiftSender gift={gift}/>: `${gift.sender_name} → ${gift.recipient_name}`)}</DialogDescription></DialogHeader>
  {gift?<>
   {gift.source==='exchange'?<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-secondary/40 p-4">
    <div className="flex min-w-0 flex-col items-center gap-2">{traded?(traded.kind==='collectible'?<CollectibleThumbnail path={traded.thumbnail_path??''} name={traded.name} className="size-20"/>:<LandscapeImage src={traded.thumbnail_path??''} alt={traded.name} className="size-20 object-contain"/>):gift.reward_kind==='gold'?<Package aria-hidden="true" className="size-14 text-primary"/>:<GiftPicture gift={gift} className="size-20"/>}<p className="break-words text-center text-xs">{traded?.name??(gift.reward_kind==='gold'?'거래 물품':gift.species.name)}</p>{(traded||gift.reward_kind!=='gold')&&<span className="text-xs text-muted-foreground">×{traded?.quantity??gift.quantity}</span>}</div>
    <ArrowLeftRight aria-label="물품과 골드 거래" className="size-5 text-muted-foreground"/>
    <div className="flex min-w-0 flex-col items-center gap-2"><GoldIcon className="size-14"/><p className="text-sm font-medium tabular-nums">{gift.reward_kind==='gold'?gift.quantity.toLocaleString('ko-KR'):'골드'}</p><span className="text-xs text-muted-foreground">{gift.reward_kind==='gold'?'받을 판매 대금':'거래 대금'}</span></div>
   </div>:null}
   {personal?<div className="rounded-xl border border-rose-200/30 bg-rose-50/40 p-4 dark:border-rose-300/10 dark:bg-rose-300/5">
    <div className="mb-3 flex min-w-0 items-center gap-2.5"><PlayerAvatar nickname={gift.sender_name} path={sender?.avatar_path} className="size-9 shrink-0 ring-2 ring-background"/><span className="min-w-0 truncate text-xs font-medium">{gift.sender_name}</span></div>
    {gift.message&&<div className="min-h-16 max-h-28 overflow-y-auto overscroll-contain"><p className="whitespace-pre-wrap break-words text-sm leading-6">{gift.message}</p></div>}
   </div>:gift.message&&<div className="flex min-h-20 max-h-32 items-start overflow-y-auto overscroll-contain rounded-xl bg-muted/50 px-4 py-3"><p className="whitespace-pre-wrap break-words text-sm leading-6">{gift.message}</p></div>}
   {gift.source!=='exchange'&&<div className="space-y-2 py-2"><GiftPicture gift={gift} className="mx-auto size-28"/><p className="text-center text-sm font-medium">{gift.reward_kind==='gold'?`${gift.quantity.toLocaleString('ko-KR')} 골드`:<>{gift.species.name} <span className="text-xs text-muted-foreground">×{gift.quantity}</span></>}</p></div>}
   {received&&(gift.reward_kind??'collectible')==='collectible'&&<p className="text-center text-xs leading-5 text-muted-foreground">보관함에 보관돼요.</p>}
   {received&&gift.status==='pending'&&<Button className="mt-2 min-h-14 w-full text-base" disabled={busy} onClick={()=>void act()}><Gift className="size-5"/>{busy?'받는 중…':'선물 받기'}</Button>}
   {received&&(gift.source??'friend')==='friend'&&gift.status==='claimed'&&!gift.reaction&&<div className="border-t pt-4"><TooltipProvider><div className="flex justify-center gap-2">{Object.entries(giftReactions).map(([key,reaction])=><Tooltip key={key}><TooltipTrigger render={<Button variant="outline" size="icon-lg" disabled={busy} aria-label={`${reaction.label} 보내기`} onClick={()=>void act(key as GiftReaction)}/> }><span className="text-xl">{reaction.emoji}</span></TooltipTrigger><TooltipContent>{reaction.label} 보내기</TooltipContent></Tooltip>)}</div></TooltipProvider></div>}
   {gift.reaction&&<p className="rounded-lg bg-primary/5 p-3 text-center text-sm">{giftReactions[gift.reaction].emoji} {received?'답장을 보냈어요.':`${gift.recipient_name}님이 ${giftReactions[gift.reaction].sent}.`}</p>}
  </>:!error&&<p role="status" className="py-6 text-center text-sm text-muted-foreground">선물을 열어보는 중…</p>}
  {error&&<div role="alert" className="space-y-2 text-xs text-destructive"><p>{error}</p>{!gift&&<Button variant="outline" onClick={()=>setRetry(value=>value+1)}>다시 불러오기</Button>}</div>}
 </DialogContent></Dialog>
}
