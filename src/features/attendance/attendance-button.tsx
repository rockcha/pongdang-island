import {appArt} from '@/components/app-art'
import {useEffect,useRef,useState} from 'react'
import {Check} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {attendanceError,claimAttendance,loadAttendance,type AttendanceState} from './api'

const {attendance:CalendarCheck}=appArt

const conch='/items/baits/conch-first-greeting.png'
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
    const bait=data.reward.bait_id==='bait_epic'?'별잠의 유혹 1개':data.reward.bait_id==='bait_first_greeting'?'소라의 첫인사 1개':data.reward.bait_id==='bait_special'?'달빛 진주새우 1개':''
    const reward=[data.reward.gold?`${data.reward.gold}골드`:'',data.reward.fuel?`연료 ${data.reward.fuel}통`:'',bait].filter(Boolean).join(' · ')
    toast.success(`출석 완료! ${reward} 획득`)
   }
   window.dispatchEvent(new Event('attendance-changed'))
   window.dispatchEvent(new Event('harbor-changed'))
   await refreshGold()
  }catch(cause){if(alive.current)setError(attendanceError(cause))}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 return <Dialog open={open} onOpenChange={next=>{if(busy)return;setOpen(next);if(next)void refresh()}}>
  <TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" className="relative size-10 min-h-10 min-w-10" aria-label={`출석체크${state?state.checkedIn?' · 오늘 출석 완료':' · 오늘 출석 전':''}`}/>}/> }><CalendarCheck className="size-7"/>{state&&!state.checkedIn&&<span data-attendance-pending className="header-indicator" aria-hidden="true"/>}</TooltipTrigger><TooltipContent>출석체크</TooltipContent></Tooltip></TooltipProvider>
  <DialogContent className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex max-h-[85dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-4 overflow-hidden rounded-t-2xl rounded-b-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
   <DialogHeader className="shrink-0 pr-6"><DialogTitle className="flex items-center gap-2 text-xl font-normal"><CalendarCheck className="size-7 text-primary"/>퐁당섬 출석체크</DialogTitle><DialogDescription className="text-xs leading-5">200골드와 연료 3통을 번갈아 받고, 7일마다 미끼만 받아요. 연속 출석 체크만 인정합니다. 하루라도 끊기면 처음부터 시작!</DialogDescription></DialogHeader>
   {loading&&!state&&<p role="status" className="py-5 text-sm text-muted-foreground">출석지를 불러오는 중…</p>}
   {error&&<div role="alert" className="space-y-2 rounded-lg bg-destructive/5 p-3 text-xs text-destructive"><p>{error}</p><Button variant="outline" disabled={busy||loading} onClick={()=>void refresh()}>다시 불러오기</Button></div>}
   {state&&<>
    <div className="-mx-4 grid min-h-0 grid-cols-7 content-start gap-0 overflow-y-auto overscroll-contain border-t border-border" aria-label="28일 출석지">{Array.from({length:28},(_,i)=>{
     const day=i+1,done=day<=state.completedDays,today=day===state.currentDay
     const reward=day===28?epic:day%7===0?conch:null,fuel=day%2===0
     return <button type="button" key={day} disabled={!today||done||busy||loading||!!error||state.checkedIn||goldBusy||goldLoading} onClick={()=>void claim()} aria-label={`${day}일차${done?' 출석 완료':today?' 오늘':''}${reward?day===28?' · 별잠의 유혹':' · 소라의 첫인사':''}${reward?'':fuel?' · 연료 3통':' · 200골드'}`} className={`relative flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 rounded-none border-r border-b border-border p-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default ${done?'bg-[#efddc5] text-[#75492d]':today&&!state.checkedIn?'attendance-claimable bg-secondary ring-2 ring-inset ring-primary':'border-border bg-background/50 text-muted-foreground'}`}>
      <span>{day}일</span>{reward?<img src={reward} alt={day===28?'별잠의 유혹':'소라의 첫인사'} className="size-7 object-contain"/>:<span className="flex flex-wrap items-center justify-center gap-0.5 text-xs font-medium tabular-nums">{fuel?<appArt.fuel className="size-6"/>:<GoldIcon className="size-4"/>}{fuel?3:200}</span>}{done&&<Check className="absolute right-1 top-1 size-4" aria-hidden="true"/>}{today&&!done&&busy&&<span className="sr-only">출석 확인 중…</span>}
      {done&&today&&celebrate>0&&<span key={celebrate} className="attendance-stamp pointer-events-none absolute inset-0 flex items-center justify-center bg-[#f2dfc8]" aria-hidden="true"><img src="/branding/pongi-starfish.png" alt="" className="size-7"/></span>}
     </button>
    })}</div>

   </>}
  </DialogContent>
 </Dialog>
}

