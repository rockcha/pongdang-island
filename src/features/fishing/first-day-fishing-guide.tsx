import {useEffect,useState} from 'react'
import {Fish,Hand,MousePointer2} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'

export function fishingGuideDay(date:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
export function FirstDayFishingGuide(){
 const {session}=useAuth()
 const id=session?.user.id,created=session?.user.created_at
 const [open,setOpen]=useState(false),[hide,setHide]=useState(false)
 const key=`pongdang:fishing-guide-hidden:${id}`
 useEffect(()=>{
  const date=new Date(created??'')
  if(!id||!Number.isFinite(date.getTime())||fishingGuideDay(date)!==fishingGuideDay(new Date())){setOpen(false);return}
  try{if(localStorage.getItem(key)===fishingGuideDay(new Date()))return}catch{}
  setHide(false);setOpen(true)
  const tomorrow=new Date();tomorrow.setTime(Date.parse(fishingGuideDay(tomorrow)+'T00:00:00+09:00')+86400000)
  const timer=setTimeout(()=>setOpen(false),Math.max(0,tomorrow.getTime()-Date.now()))
  return()=>clearTimeout(timer)
 },[id,created,key])
 function close(){if(hide){try{localStorage.setItem(key,fishingGuideDay(new Date()))}catch{}}setOpen(false)}
 return <Dialog open={open} disablePointerDismissal onOpenChange={(_open,details)=>details.cancel()}><DialogContent showCloseButton={false} className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-sm">
  <header className="shrink-0 bg-secondary/50 px-5 py-4"><DialogTitle className="text-base">첫 낚시, 이렇게 해요</DialogTitle><DialogDescription className="mt-1 text-xs">누르고, 떼고! 가운데를 지키면 돼요.</DialogDescription></header>
  <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
   {[{Icon:Fish,title:'미끼를 고르고 낚시 시작',body:'찌에 입질이 오면 화면 안내를 눌러 시작해요.'},{Icon:MousePointer2,title:'게이지가 낮으면 꾹 누르기',body:'릴 버튼을 누르고 있으면 게이지가 올라가요.'},{Icon:Hand,title:'너무 높아지면 손 떼기',body:'놓으면 게이지가 내려가요. 양쪽 끝에 닿지 않게 조절해요.'}].map(({Icon,title,body},i)=><div key={title} className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><Icon className="size-5"/></span><div><h3 className="text-sm font-medium"><span className="mr-1.5 text-primary">{i+1}.</span>{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p></div></div>)}
   <div className="rounded-2xl border bg-secondary/20 p-3"><div className="relative h-3 overflow-hidden rounded-full bg-red-200"><div className="absolute inset-y-0 left-[20%] right-[15%] bg-emerald-300"/><span className="absolute inset-y-0 left-1/2 w-1 rounded bg-primary"/></div><p className="mt-2 text-center text-xs text-muted-foreground">초록색 가운데 구간을 유지하세요</p></div>
  </div>
  <footer className="shrink-0 space-y-2 border-t px-5 py-3"><label className="flex min-h-9 items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={hide} onChange={e=>setHide(e.target.checked)} className="size-4 accent-primary"/>오늘 하루 안 보기</label><Button onClick={close} className="min-h-11 w-full rounded-xl">알겠어요 · 닫기</Button></footer>
 </DialogContent></Dialog>
}
