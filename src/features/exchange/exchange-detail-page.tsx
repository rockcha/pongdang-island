import {playPurchaseSound} from '@/features/gold/purchase-sound'
import {BoardTime} from '@/features/board/board-time'
import {useEffect,useRef,useState} from 'react'
import {useParams,Link,useNavigate} from 'react-router'
import {Heart,MessageCircle,RefreshCw,Trash2,Send,Ellipsis,Pencil} from 'lucide-react'
import {toast} from 'sonner'
import {Menu} from '@base-ui/react/menu'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {useSocial} from '@/features/social/social-provider'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {AssetView} from './asset-view'
import {actExchange,addExchangeComment,deleteExchangeComment,exchangeChanged,exchangeError,editExchangeTitle,loadExchangeDetail,setExchangeLike} from './api'
import type {ExchangeComment,ExchangeListing} from './api'

export function ExchangeDetailPage(){const {listingId=''}=useParams();const {session}=useAuth();return <ListingDetail key={listingId+session?.user.id} id={listingId} owner={session?.user.id??''}/>}
function ListingDetail({id,owner}:{id:string;owner:string}){
 const wallet=useGold(),social=useSocial(),navigate=useNavigate()
 const [listing,setListing]=useState<ExchangeListing|null>(null),[comments,setComments]=useState<ExchangeComment[]>([])
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [body,setBody]=useState(''),[confirm,setConfirm]=useState(false),[deleting,setDeleting]=useState<string|null>(null)
 const [editing,setEditing]=useState(false),[title,setTitle]=useState(''),[editError,setEditError]=useState('')
 const lock=useRef(false),alive=useRef(true),version=useRef(0)
 const pending=useRef<{id:string;body:string}|null>(null)
 async function reload(more=false){
  const current=++version.current
  setLoading(true);setError('')
  try{const data=await loadExchangeDetail(id,more?comments.length:0);if(alive.current&&current===version.current){setListing(data.listing);setComments(old=>more?[...old,...data.comments.filter(c=>!old.some(item=>item.id===c.id))]:data.comments)}}
  catch(cause){if(alive.current&&current===version.current)setError(exchangeError(cause))}
  finally{if(alive.current&&current===version.current)setLoading(false)}
 }
 useEffect(()=>{alive.current=true;void reload();const focus=()=>{if(!lock.current)void reload()};window.addEventListener('focus',focus);window.addEventListener('online',focus);return()=>{alive.current=false;version.current++;window.removeEventListener('focus',focus);window.removeEventListener('online',focus)}},[id])
 async function saveTitle(){
  if(lock.current||!title.trim())return
  lock.current=true;setBusy(true);setEditError('')
  try{await editExchangeTitle(id,title.trim());exchangeChanged();if(alive.current){setListing(old=>old?{...old,title:title.trim()}:old);setEditing(false);toast.success('판매글을 수정했어요.')}}
  catch(cause){if(alive.current)setEditError(exchangeError(cause))}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 async function mutate(action:'like'|'comment'|'delete'|'trade'){
  if(lock.current||!listing)return
  lock.current=true;setBusy(true);setError('')
  try{
   if(action==='like'){
    const result=await setExchangeLike(id,!listing.liked)
    if(alive.current)setListing(old=>old?{...old,...result}:old)
   }else if(action==='comment'){
    pending.current??={id:crypto.randomUUID(),body:body.trim()}
    await addExchangeComment(id,pending.current.body,pending.current.id)
    pending.current=null
    if(alive.current)setBody('')
    await reload()
   }else if(action==='delete'){
    if(!deleting)return
    await deleteExchangeComment(deleting)
    if(alive.current)setDeleting(null)
    await reload()
   }else{
    await actExchange(id,listing.owner_id===owner?'cancel':'accept')
    if(alive.current&&listing.owner_id!==owner)playPurchaseSound(`exchange:${id}`)
    exchangeChanged();void wallet.refresh();void social.refresh()
    if(alive.current){setConfirm(false);toast.success(listing.owner_id===owner?'판매글을 내리고 물품을 선물함으로 보냈어요.':'구매했어요. 선물함에서 물품을 받아주세요.')}
    if(listing.owner_id===owner){if(alive.current)navigate('/exchange');return}
    await reload()
   }
  }catch(cause){if(alive.current){setError(exchangeError(cause));if(action==='comment'&&/^[0-9A-Z]{5}$/.test(String((cause as {code?:string})?.code)))pending.current=null}}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const mine=listing?.owner_id===owner,closed=listing?.status==='cancelled'
 return <section className="flex min-h-0 min-w-0 flex-1 flex-col">
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
   {error&&<div role="alert" className="my-3 flex items-center justify-between gap-2 text-xs text-destructive"><p>{error}</p><Button aria-label="판매글 다시 불러오기" variant="ghost" size="icon" disabled={busy||loading} onClick={()=>void reload()}><RefreshCw className="size-4"/></Button></div>}
   {loading&&!listing&&<p role="status" className="py-12 text-center text-sm text-muted-foreground">판매글을 불러오는 중…</p>}
   {listing&&<>
    <header className="space-y-4 pt-5 pb-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="mb-2 text-[10px] tracking-wide text-muted-foreground">{listing.status==='active'?'판매 중':listing.status==='completed'?'판매 완료':'판매 취소'}</p><h2 className="break-words text-xl font-medium leading-8">{listing.title||listing.offer.name+' 판매합니다'}</h2></div>
     {mine&&listing.status==='active'&&<Menu.Root><Menu.Trigger disabled={busy} render={<Button variant="ghost" size="icon" aria-label="판매글 관리" className="size-10 shrink-0 text-muted-foreground"/>}><Ellipsis className="size-5"/></Menu.Trigger><Menu.Portal><Menu.Positioner align="end" sideOffset={6} className="z-50"><Menu.Popup className="min-w-36 rounded-xl border bg-popover p-1 text-xs shadow-lg"><Menu.Item onClick={()=>{setTitle(listing.title||listing.offer.name+' 판매합니다');setEditError('');setEditing(true)}} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none data-highlighted:bg-secondary"><Pencil className="size-3.5"/>제목 수정</Menu.Item><Menu.Item onClick={()=>{setError('');setConfirm(true)}} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-destructive outline-none data-highlighted:bg-secondary"><Trash2 className="size-3.5"/>판매글 삭제</Menu.Item></Menu.Popup></Menu.Positioner></Menu.Portal></Menu.Root>}
     </div><div className="flex items-center gap-2"><PlayerAvatar userId={listing.owner_id} nickname={listing.owner_name} path={listing.owner_avatar_path} className="size-7"/><div className="min-w-0"><div className="inline-flex max-w-full min-w-0 items-center gap-1 align-middle"><p className="truncate text-xs">{listing.owner_name}</p></div><BoardTime value={listing.created_at} className="mt-0.5 block text-[10px] text-muted-foreground"/></div></div></header>
    <div className="space-y-4 border-y border-border/60 py-6"><AssetView asset={listing.offer}/><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{listing.offer.items?.length?'묶음 전체 가격':'판매 가격'}</span><p className="flex shrink-0 items-center gap-1.5 text-xl tabular-nums text-primary"><GoldIcon className="size-5"/>{listing.wanted.quantity.toLocaleString('ko-KR')}</p></div></div>
    <div className="flex items-center justify-between border-b border-border/60 py-2"><Button variant="ghost" className="min-h-11 gap-1.5 px-2 text-xs text-muted-foreground" aria-label="좋아요" aria-pressed={!!listing.liked} disabled={busy||closed} onClick={()=>void mutate('like')}><Heart aria-hidden="true" className={listing.liked?'size-4 fill-primary text-primary':'size-4'}/>좋아요 {listing.like_count??0}</Button><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessageCircle aria-hidden="true" className="size-3.5"/>댓글 {listing.comment_count??0}</span></div>
    <section aria-label="판매글 댓글" className="pt-5"><h3 className="text-sm">댓글</h3>
     {!closed&&<form className="mt-3 space-y-2" onSubmit={e=>{e.preventDefault();if(body.trim()&&!busy)void mutate('comment')}}><label className="sr-only" htmlFor="exchange-comment">댓글 내용</label><textarea id="exchange-comment" maxLength={500} rows={2} placeholder="판매자에게 궁금한 점을 남겨보세요." value={body} disabled={busy||!!pending.current} onChange={e=>setBody(e.target.value)} className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"/><div className="flex items-center justify-between"><span className="text-[10px] tabular-nums text-muted-foreground">{body.length}/500</span><Button type="submit" variant="ghost" disabled={busy||!body.trim()} className="min-h-10 gap-1.5 text-xs"><Send className="size-3.5"/>{pending.current?'댓글 다시 등록':'댓글 등록'}</Button></div></form>}
     <ul className="mt-4 divide-y divide-border/60">{comments.map(comment=><li key={comment.id} className="flex gap-2.5 py-4"><PlayerAvatar userId={comment.user_id} nickname={comment.author_name} path={comment.author_avatar_path} className="size-7"/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="min-w-0 truncate text-xs">{comment.author_name}{comment.user_id===listing.owner_id&&<span className="ml-1 text-[10px] text-primary">판매자</span>}</p><BoardTime value={comment.created_at} className="shrink-0 text-[10px] text-muted-foreground"/>{comment.user_id===owner&&<Button variant="ghost" size="icon" aria-label={`${comment.author_name} 댓글 삭제`} className="ml-auto size-8 shrink-0" disabled={busy} onClick={()=>setDeleting(comment.id)}><Trash2 className="size-3.5"/></Button>}</div><p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6">{comment.body}</p></div></li>)}</ul>
     {!comments.length&&!loading&&<p className="py-8 text-center text-xs text-muted-foreground">아직 댓글이 없어요.</p>}
     {comments.length<(listing.comment_count??0)&&<Button variant="ghost" className="mt-2 min-h-11 w-full text-xs" disabled={loading||busy} onClick={()=>void reload(true)}>{loading?'불러오는 중…':'댓글 더 보기'}</Button>}
    </section>
   </>}
   {!listing&&!loading&&!error&&<p className="py-10 text-center text-sm">판매글을 찾을 수 없어요. <Link className="text-primary underline" to="/exchange">목록으로</Link></p>}
  </div>
  {listing&&!mine&&<Button className="min-h-14 w-full shrink-0 gap-2 rounded-none border-t pb-[env(safe-area-inset-bottom)]" disabled={busy||listing.status!=='active'} onClick={()=>{setError('');setConfirm(true)}}>{listing.status!=='active'?(listing.status==='completed'?'판매 완료':'판매 취소'):<><span>구매하기</span><GoldIcon className="size-5"/>{listing.wanted.quantity.toLocaleString('ko-KR')}</>}</Button>}
  <ConfirmDialog compact open={confirm} onOpenChange={setConfirm} title={mine?'판매글을 삭제할까요?':`${listing?.title||listing?.offer.name} 구매할까요?`} description={mine?'판매글을 내리고 맡긴 물품 전체를 선물함으로 돌려받아요.':'선택한 판매글의 물품 전체를 한 번에 구매해요. 선물함에서 받아주세요.'} confirmLabel={mine?'판매글 삭제':<><GoldIcon className="size-5"/>{listing?.wanted.quantity.toLocaleString('ko-KR')}</>} busy={busy} error={error} onConfirm={()=>void mutate('trade')}>{listing&&<div className="max-h-[40dvh] overflow-y-auto"><AssetView asset={listing.offer} compact/></div>}</ConfirmDialog>
  <Dialog open={editing} onOpenChange={open=>{if(!busy)setEditing(open)}}><DialogContent className="rounded-xl p-5 sm:max-w-sm"><DialogHeader><DialogTitle>판매글 제목 수정</DialogTitle><DialogDescription className="text-xs">물품과 수량, 가격은 그대로 유지돼요.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={event=>{event.preventDefault();void saveTitle()}}><label className="block space-y-2"><span className="text-xs text-muted-foreground">판매글 제목</span><input autoFocus aria-label="판매글 제목" value={title} onChange={event=>setTitle(event.target.value)} maxLength={80} disabled={busy} className="min-h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"/></label>{editError&&<p role="alert" className="text-xs text-destructive">{editError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={()=>setEditing(false)}>취소</Button><Button type="submit" disabled={busy||!title.trim()||/[\r\n\t]/.test(title)}>{busy?'저장 중…':'저장'}</Button></div></form></DialogContent></Dialog>
  <ConfirmDialog open={!!deleting} onOpenChange={open=>{if(!open)setDeleting(null)}} title="댓글을 삭제할까요?" description="삭제한 댓글은 되돌릴 수 없어요." busy={busy} error={error} onConfirm={()=>void mutate('delete')}/>
 </section>
}
