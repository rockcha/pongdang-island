import {useEffect,useRef,useState} from 'react'
import {Navigate,useBlocker,useLocation,useNavigate} from 'react-router'
import {ChevronLeft} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {usePwaUpdateBlock} from '@/features/pwa/update-blockers'
import {CatchMoment} from './catch-moment'
import {getShowcaseDraft,clearShowcaseDraft,savePreviewShowcase} from './draft'
import {publishShowcase,publishExpeditionShowcase,showcaseError} from './api'

export function ShowcaseEditor(){
 const {session}=useAuth(),location=useLocation(),navigate=useNavigate()
 const draft=getShowcaseDraft(session?.user.id??'',location.state?.showcaseDraft)
 const [caption,setCaption]=useState(draft?.caption??''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [artReady,setArtReady]=useState(false)
 const lock=useRef(false),done=useRef(false)
 usePwaUpdateBlock(!!draft)
 const blocker=useBlocker(({currentLocation,nextLocation})=>!done.current&&!!draft&&(busy||caption.trim().length>0)&&currentLocation.pathname!==nextLocation.pathname)
 useEffect(()=>{
  if(!caption.trim()&&!busy)return
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)
 },[caption,busy])
 async function publish(){
  if(!draft||!artReady||lock.current||caption.length>200)return
  lock.current=true;setBusy(true);setError('')
  try{
   draft.caption=caption.trim()
   if(draft.preview){savePreviewShowcase(draft);done.current=true;clearShowcaseDraft(draft.id);navigate('/showcase',{replace:true,state:{showcasePreview:true}});return}
   if(draft.source&&draft.tripId)await publishExpeditionShowcase(draft.source,draft.tripId,draft.operationId,draft.caption)
   else await publishShowcase(draft.operationId,draft.caption)
   done.current=true;clearShowcaseDraft(draft.id);toast.success('특별한 순간을 자랑했어요.');navigate('/showcase',{replace:true})
  }catch(cause){setError(showcaseError(cause))}finally{lock.current=false;setBusy(false)}
 }
 if(!draft)return <Navigate to="/showcase" replace/>
 return <section className="flex min-h-0 flex-1 flex-col">
  <div className="flex shrink-0 items-center gap-2 border-b px-3"><button type="button" disabled={busy} onClick={()=>navigate('/showcase')} aria-label="작성 취소" className="grid size-11 place-items-center rounded-lg text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChevronLeft className="size-4"/></button><h1 className="text-sm">이 순간 자랑하기</h1></div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
   {draft.preview&&<p className="bg-secondary/30 px-4 py-3 text-xs leading-5 text-primary">미리보기 모드예요. 실제 게시하거나 미끼를 사용하지 않아요.</p>}
   <CatchMoment species={draft.species} firstDiscovery={draft.firstDiscovery} renderVersion={draft.renderVersion} regionName={draft.regionName} caughtAt={draft.caughtAt} preview={draft.preview} onReadyChange={setArtReady}/>
   <div className="space-y-2 px-4 pt-4"><label htmlFor="showcase-caption" className="text-sm"><span aria-hidden="true">💬 </span>이 순간, 어땠나요?</label><textarea id="showcase-caption" placeholder="드디어 만났다…! 손 떨렸어요." maxLength={200} rows={3} disabled={busy} value={caption} onChange={event=>{setCaption(event.target.value);draft.caption=event.target.value}} className="min-h-24 w-full resize-none rounded-lg border border-border bg-white p-3 text-sm leading-6 text-slate-800 placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-ring"/><p className="text-right text-[11px] tabular-nums text-muted-foreground">{caption.length} / 200</p>{error&&<p role="alert" className="text-xs leading-5 text-destructive">{error}</p>}</div>
  </div>
  <div className="shrink-0 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button className="h-12 w-full rounded-lg" disabled={!artReady||busy||caption.length>200} onClick={()=>void publish()}>{busy?'올리는 중…':draft.preview?'미리보기로 확인':'자랑 올리기'}</Button></div>
  <ConfirmDialog open={blocker.state==='blocked'} onOpenChange={open=>{if(!open&&blocker.state==='blocked')blocker.reset()}} title="작성을 그만둘까요?" description="아직 올리지 않은 사진과 캡션은 목록에 남지 않아요." confirmLabel="그만두기" cancelLabel="계속 작성" busy={busy} onConfirm={()=>{if(blocker.state==='blocked'&&!busy){clearShowcaseDraft(draft.id);blocker.proceed()}}}/>
 </section>
}
