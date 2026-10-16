import {useEffect,useRef,useState} from 'react'
import {CalendarCheck,Check,Gift} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {attendanceError,claimAttendance,loadAttendance,type AttendanceState} from './api'

const shrimp='/items/baits/special.png'
const epic='/items/baits/starlit-allure.png'
export function AttendanceButton(){
 const {session}=useAuth()
 return session?<Attendance key={session.user.id}/>:null
}
function Attendance(){
 const [open,setOpen]=useState(false),[state,setState]=useState<AttendanceState|null>(null)
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[celebrate,setCelebrate]=useState(0)
 const {refresh:refreshGold,busy:goldBusy,loading:goldLoading}=useGold()
 const alive=useRef(true),lock=useRef(false),version=useRef(0)
 async function refresh(){
  if(lock.current)return
  const request=++version.current
  setLoading(true)
  try{const data=await loadAttendance();if(alive.current&&request===version.current){setState(data);setError('')}}
  catch(cause){if(alive.current&&request===version.current)setError(attendanceError(cause))}
  finally{if(alive.current&&request===version.current)setLoading(false)}
 }
 useEffect(()=>{
  alive.current=true;void refresh()
  const reload=()=>{if(document.visibilityState==='visible')void refresh()}
  let midnight:ReturnType<typeof setTimeout>
  function schedule(){midnight=setTimeout(()=>{reload();schedule()},86400000-(Date.now()+9*3600000)%86400000+200)}
  schedule();window.addEventListener('focus',reload);window.addEventListener('online',reload);document.addEventListener('visibilitychange',reload)
  return()=>{alive.current=false;version.current++;clearTimeout(midnight);window.removeEventListener('focus',reload);window.removeEventListener('online',reload);document.removeEventListener('visibilitychange',reload)}
  // Account changes remount the component.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])
 async function claim(){
  if(!state||state.checkedIn||loading||error||lock.current||goldBusy||goldLoading)return
  lock.current=true;version.current++;setBusy(true);setError('')
  try{
   const data=await claimAttendance(state.today)
   if(!alive.current)return
   setState(data)
   if(!data.replayed){
    setCelebrate(value=>value+1)
    const bait=data.reward.bait_id==='bait_epic'?' · 별잠의 유혹 1개':data.reward.bait_id==='bait_special'?' · 달빛 진주새우 1개':''
    toast.success(`출석 완료! 50골드${bait}를 받았습니다.`)
   }
   window.dispatchEvent(new Event('attendance-changed'))
   await refreshGold()
  }catch(cause){if(alive.current)setError(attendanceError(cause))}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 return <Dialog open={open} onOpenChange={next=>{if(busy)return;setOpen(next);if(next)void refresh()}}>
  <TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" className="relative size-10 min-h-10 min-w-10" aria-label={`출석체크${state?state.checkedIn?' · 오늘 출석 완료':' · 오늘 출석 전':''}`}/>}/> }><CalendarCheck className="size-5"/>{state&&!state.checkedIn&&<span data-attendance-pending className="header-indicator" aria-hidden="true"/>}</TooltipTrigger><TooltipContent>출석체크</TooltipContent></Tooltip></TooltipProvider>
  <DialogContent className="pongi-confirm max-h-[90dvh] overflow-y-auto rounded-[10px] p-5 sm:max-w-md">
   <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl font-normal"><CalendarCheck className="size-5 text-primary"/>매일 만나는 퐁당섬</DialogTitle><DialogDescription className="text-xs leading-5">하루 한 번, 28일의 작은 약속을 채워보세요.<br/>한국 시간 자정에 하루가 바뀌며, 하루 빠지면 1일차부터 다시 시작해요.</DialogDescription></DialogHeader>
   {loading&&!state&&<p role="status" className="py-5 text-sm text-muted-foreground">출석지를 불러오는 중…</p>}
   {error&&<div role="alert" className="space-y-2 rounded-lg bg-destructive/5 p-3 text-xs text-destructive"><p>{error}</p><Button variant="outline" disabled={busy||loading} onClick={()=>void refresh()}>다시 불러오기</Button></div>}
   {state&&<>
    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{state.sheetNumber}번째 출석지</span><span className="tabular-nums">{state.completedDays}<span className="text-muted-foreground"> / 28일</span></span></div>
    {state.reset&&!state.checkedIn&&<p className="text-xs text-muted-foreground">하루 쉬었네요. 오늘부터 새롭게 시작해요.</p>}
    <div className="grid grid-cols-7 gap-1.5" aria-label="28일 출석지">{Array.from({length:28},(_,i)=>{
     const day=i+1,done=day<=state.completedDays,today=day===state.currentDay
     const reward=day===28?epic:day%7===0?shrimp:null
     return <div key={day} aria-label={`${day}일차${done?' 출석 완료':today?' 오늘':''}${reward?day===28?' · 별잠의 유혹':' · 달빛 진주새우':''}`} className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-[10px] ${done?'border-[#d5b38c] bg-[#efddc5] text-[#75492d]':today?'border-[#995e36] bg-[#fffdf9] ring-1 ring-[#995e36]':'border-border bg-background/50 text-muted-foreground'}`}>
      <span>{day}</span>{done?<Check className="size-4"/>:reward?<img src={reward} alt="" className="size-5 object-contain"/>:<GoldIcon className="size-4 opacity-60"/>}
      {done&&today&&celebrate>0&&<span key={celebrate} className="attendance-stamp pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-[#f2dfc8]" aria-hidden="true"><img src="/branding/pongi-starfish.png" alt="" className="size-7"/></span>}
     </div>
    })}</div>
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-secondary/60 px-2 py-3 text-center text-[11px] text-muted-foreground">
     <div><GoldIcon className="mx-auto mb-1 size-6"/><p>매일 50골드</p></div>
     <div><img src={shrimp} alt="" className="mx-auto mb-1 size-6 object-contain"/><p>7·14·21일</p><p className="mt-0.5">진주새우 1개</p></div>
     <div><img src={epic} alt="" className="mx-auto mb-1 size-6 object-contain"/><p>28일 완주</p><p className="mt-0.5">별잠의 유혹 1개</p></div>
    </div>
    <Button className="min-h-11 w-full gap-2" disabled={busy||loading||!!error||state.checkedIn||goldBusy||goldLoading} onClick={()=>void claim()}>{busy?'출석 확인 중…':state.checkedIn?<><Check className="size-4"/>오늘 출석 완료</>:<><Gift className="size-4"/>오늘 출석하고 보상 받기</>}</Button>
    <p className="text-center text-[11px] leading-5 text-muted-foreground">{state.checkedIn&&state.currentDay===28?'완주했어요! 내일은 새로운 출석지가 열립니다.':'28일을 완주하면 다음 날 같은 보상의 새 출석지가 열립니다.'}</p>
   </>}
  </DialogContent>
 </Dialog>
}
