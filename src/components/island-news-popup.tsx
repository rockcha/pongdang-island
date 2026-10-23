import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react'
import {useLocation} from 'react-router'
import {X} from 'lucide-react'
import {getNickname,useAuth} from './auth-provider'
import {appArt} from './app-art'
import {Button} from './ui/button'
import {Dialog,DialogContent,DialogDescription,DialogTitle} from './ui/dialog'
const HomePage=lazy(()=>import('@/pages/home-page').then(module=>({default:module.HomePage})))

export function islandNewsDay(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
}
export function IslandNewsPopup(){
 const {session,loading,recovery}=useAuth()
 if(loading||recovery||!session||!getNickname(session))return null
 return <AccountNewsPopup key={session.user.id} userId={session.user.id}/>
}
function AccountNewsPopup({userId}:{userId:string}){
 const {pathname}=useLocation(),attempted=useRef(false)
 const [open,setOpen]=useState(false),[hideToday,setHideToday]=useState(false)
 const storageKey=`pongdang:news-hidden:${userId}`
 const dismiss=useCallback(()=>{
  if(hideToday){try{localStorage.setItem(storageKey,islandNewsDay())}catch{/* Closing still works when device storage is unavailable. */}}
  setOpen(false)
 },[hideToday,storageKey])
 useEffect(()=>{
  if(pathname.replace(/\/+$/,'')!=='/aquarium'){dismiss();return}
  if(attempted.current)return
  attempted.current=true
  try{if(localStorage.getItem(storageKey)===islandNewsDay())return}catch{/* Show news normally when storage is unavailable. */}
  setOpen(true)
 },[pathname,storageKey,dismiss])
 return <Dialog open={open} disablePointerDismissal onOpenChange={(_value,details)=>details.cancel()}>
  <DialogContent showCloseButton={false} className="top-[max(1rem,env(safe-area-inset-top))] flex h-[min(24rem,calc(50dvh-1rem))] w-[calc(100%-2rem)] max-w-md -translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
   <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2"><appArt.island className="size-7"/><DialogTitle className="text-sm font-medium">퐁당섬 소식</DialogTitle><Button variant="ghost" size="icon" aria-label="소식 닫기" className="ml-auto size-10 shrink-0 rounded-full" onClick={dismiss}><X className="size-4"/></Button></header>
   <DialogDescription className="sr-only">새로운 해역과 어종, 이벤트 소식을 확인해 보세요.</DialogDescription>
   <div className="flex min-h-0 flex-1 flex-col overflow-hidden"><Suspense fallback={<p role="status" className="p-5 text-center text-xs text-muted-foreground">소식을 불러오는 중…</p>}><HomePage/></Suspense></div>
   <footer className="flex shrink-0 items-center justify-between gap-3 border-t bg-background px-4 py-3"><label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={hideToday} onChange={event=>setHideToday(event.target.checked)} className="size-4 accent-primary"/>오늘 하루 안 보기</label><Button onClick={dismiss} className="min-h-10 min-w-20 rounded-xl text-xs">닫기</Button></footer>
  </DialogContent>
 </Dialog>
}
