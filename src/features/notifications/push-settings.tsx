import {useEffect,useRef,useState} from 'react'
import {BellRing,Check,LoaderCircle,Smartphone} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {currentPushDevice,disablePush,enablePush,needsHomeScreen,pushCategories,defaultPushCategories,pushConfiguration,queuePushTest,savePushCategories,supportsPush,type PushCategory} from './push-device'

const labels:Record<PushCategory,string>={'production':'연료 생산 완료','bait-production':'미끼 생산 완료',expedition:'통발 수확 준비',harbor:'어선 귀항','bait-production-expiring':'미끼 만료 5분 전','production-expiring':'연료 만료 5분 전','voyage-bets':'만선 승부장 · 출항 1시간 전'}
export function PushSettings(){
 const {session}=useAuth()
 return <DeviceSettings key={session?.user.id??'guest'} userId={session?.user.id}/>
}
function DeviceSettings({userId}:{userId?:string}){
 const supported=supportsPush(),homeScreen=typeof window!=='undefined'&&needsHomeScreen()
 const [configuration,setConfiguration]=useState<{configured:boolean;publicKey:string|null}|null>(null)
 const [registered,setRegistered]=useState(false),[categories,setCategories]=useState<PushCategory[]>([...defaultPushCategories])
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(!!userId&&supported&&!homeScreen),[error,setError]=useState(''),[message,setMessage]=useState(''),[attempt,setAttempt]=useState(0)
 const alive=useRef(true),lock=useRef(false)
 useEffect(()=>{
  alive.current=true
  if(userId&&supported&&!homeScreen){
   setLoading(true);setError('')
   void Promise.all([pushConfiguration(),currentPushDevice()]).then(([config,state])=>{if(alive.current){setConfiguration(config);setRegistered(state.registered);setCategories(state.registered?state.categories:[...defaultPushCategories])}}).catch(cause=>{if(alive.current)setError(cause instanceof Error?cause.message:'알림 설정을 확인하지 못했어요.')}).finally(()=>{if(alive.current)setLoading(false)})
  }
  return()=>{alive.current=false}
 },[userId,supported,homeScreen,attempt])
 async function run(work:()=>Promise<void>){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('')
  try{await work()}catch(cause){if(alive.current){const text=String((cause as {message?:string})?.message??cause);setError(text.includes('RATE_LIMIT')?'테스트 알림은 1분에 한 번 보낼 수 있어요.':text.includes('DEVICE_CONFLICT')?'이전 계정의 알림 연결이 남아 있어요. 로그아웃 후 다시 로그인해 주세요.':text.includes('DEVICE_LIMIT')?'연결된 기기가 많아요. 다른 기기에서 알림을 끈 뒤 다시 시도해 주세요.':text)}}finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 async function toggle(){
  if(registered){await disablePush();if(alive.current){setRegistered(false);setMessage('이 기기의 푸시 알림을 껐어요.')}}
  else if(userId&&configuration?.publicKey){const state=await enablePush(userId,configuration.publicKey,categories);if(alive.current){setRegistered(state.registered);setMessage('이 기기에서 완료 소식을 받을 수 있어요.')}}
 }
 async function change(category:PushCategory){
  const next=categories.includes(category)?categories.filter(c=>c!==category):[...categories,category]
  if(registered)await savePushCategories(next)
  if(alive.current)setCategories(next)
 }
 return <section aria-labelledby="push-settings-title" className="overflow-hidden rounded-2xl border border-border/60 bg-card/70">
  <h2 id="push-settings-title" className="flex items-center gap-2 border-b border-border/50 px-5 py-4 text-xs font-medium text-muted-foreground"><BellRing className="size-4"/>푸시 알림</h2>
  <div className="space-y-4 px-5 py-5">
   <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary"><img src="/branding/pongi.png" alt="" className="size-9 object-contain"/></span><div className="min-w-0"><p className="text-sm font-medium">완료되면 퐁당, 알려드릴게요</p><p className="mt-1 text-xs leading-6 text-muted-foreground">앱을 닫아두어도 생산·수확·귀항 소식을 받아요.</p></div></div>
   {!userId?<p className="text-xs leading-6 text-muted-foreground">로그인한 뒤 알림을 켤 수 있어요.</p>:homeScreen?<p className="rounded-xl bg-secondary/50 p-3 text-xs leading-6 text-muted-foreground">아이폰·아이패드는 공유 메뉴에서 <b className="text-primary">홈 화면에 추가</b>한 뒤, 홈 화면의 퐁당섬을 열어 알림을 켜 주세요. iOS/iPadOS 16.4 이상이 필요해요.</p>:!supported?<p className="text-xs leading-6 text-muted-foreground">이 환경에서는 푸시 알림을 지원하지 않아요. HTTPS로 접속한 최신 브라우저에서 다시 확인해 주세요.</p>:loading?<p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>이 기기의 알림을 확인하고 있어요.</p>:<>
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/35 px-3 py-3"><span className="flex items-center gap-2 text-xs"><Smartphone className="size-4 text-primary"/>이 기기에서 알림 받기</span><button type="button" role="switch" aria-label="이 기기 푸시 알림" aria-checked={registered} disabled={busy||(!registered&&!configuration?.configured)} onClick={()=>void run(toggle)} className="flex min-h-11 min-w-12 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"><span className={'flex h-6 w-10 items-center rounded-full p-0.5 transition-colors '+(registered?'bg-primary':'bg-primary/15')}><span className={'size-5 rounded-full bg-background shadow-sm transition-transform '+(registered?'translate-x-4':'translate-x-0')}/></span></button></div>
    {!configuration?.configured&&!error&&<p className="text-xs leading-6 text-muted-foreground">푸시 알림을 준비하고 있어요. 준비가 끝나면 여기에서 켤 수 있어요.</p>}
    <fieldset disabled={busy} className="grid grid-cols-2 gap-2"><legend className="mb-2 text-[11px] text-muted-foreground">받을 소식</legend>{pushCategories.map(category=><label key={category} className={'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-1 text-xs '+(category.endsWith('-expiring')?'col-span-2':'')}><input type="checkbox" checked={categories.includes(category)} onChange={()=>void run(()=>change(category))} className="size-3.5 accent-primary"/>{labels[category]}</label>)}</fieldset>
    {registered&&<Button variant="outline" disabled={busy} className="min-h-10 w-full rounded-xl text-xs" onClick={()=>void run(async()=>{await queuePushTest();if(alive.current)setMessage('테스트 알림을 예약했어요. 앱을 닫고 1분 안팎 기다려 주세요.')})}><BellRing className="size-3.5"/>테스트 알림 받기</Button>}
   </>}
   {message&&<p role="status" className="flex items-start gap-1.5 text-xs leading-6 text-primary"><Check className="mt-1 size-3.5 shrink-0"/>{message}</p>}
   {error&&<div role="alert" className="text-xs leading-6 text-destructive"><p>{error}</p><button type="button" disabled={busy} onClick={()=>setAttempt(v=>v+1)} className="min-h-9 underline">다시 확인</button></div>}
  </div>
  <p className="border-t border-border/40 bg-secondary/20 px-5 py-3 text-[11px] leading-5 text-muted-foreground">만료 알림은 보관 종료 약 5분 전에 보내요. 기기마다 따로 설정돼요. 알림을 누르면 해당 페이지로 이동해요. 기기·네트워크 상태에 따라 늦게 도착할 수 있어요.</p>
 </section>
}
