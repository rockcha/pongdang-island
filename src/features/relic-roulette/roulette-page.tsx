import {useEffect,useRef,useState} from 'react'
import {RotateCw,Volume2,VolumeX} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {useAccountResource} from '@/lib/account-query'
import {useAppClock} from '@/lib/app-clock'
import {randomId} from '@/lib/random-id'
import {playRelicResultSound} from '@/features/gold/purchase-sound'
import {readFishingSound} from '@/features/fishing/sound-preference'
import {readRoulette,rouletteRejection,spinRoulette,type RouletteRequest,type RouletteSpin} from './api'
import {rouletteGrades} from './model'
import {RouletteRewardDialog} from './reward-dialog'
import type {WheelController} from './wheel-scene'
import './roulette.css'

const storageKey=(owner:string)=>`pongdang:relic-roulette:pending:${owner}`
function readPending(owner:string):RouletteRequest|null {
  try{const data=JSON.parse(sessionStorage.getItem(storageKey(owner))??'null');return typeof data?.operation==='string'&&typeof data.expectedFree==='boolean'?data:null}catch{return null}
}
export function RelicRoulettePage(){
  const {session}=useAuth()
  return <AccountRoulette key={session?.user.id??'guest'} owner={session?.user.id??'guest'}/>
}
function AccountRoulette({owner}:{owner:string}){
  const query=useAccountResource('relic-roulette',readRoulette,{staleTime:0}),clock=useAppClock()
  const host=useRef<HTMLDivElement>(null),wheel=useRef<WheelController|null>(null),alive=useRef(true),locked=useRef(false)
  const [ready,setReady]=useState(false),[wheelError,setWheelError]=useState(false)
  const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[error,setError]=useState('')
  const [rewardOpen,setRewardOpen]=useState(false)
  const [pending,setPending]=useState<RouletteRequest|null>(()=>readPending(owner))
  const pendingRef=useRef(pending);pendingRef.current=pending
  const [result,setResult]=useState<RouletteSpin|null>(null),[sound,setSound]=useState(()=>readFishingSound())
  const soundRef=useRef(sound);soundRef.current=sound
  const state=query.data,resetPassed=!!state&&clock>=Date.parse(state.resetAt)
  const resetRequested=useRef<string|null>(null)
  useEffect(()=>{
    if(resetPassed&&state&&resetRequested.current!==state.resetAt){resetRequested.current=state.resetAt;void query.refetch({cancelRefetch:false})}
  },[resetPassed,state?.resetAt,query.refetch])
  useEffect(()=>{
    alive.current=true
    let cancelled=false
    import('./wheel-scene').then(({mountRelicWheel})=>{
      if(cancelled||!host.current)return
      wheel.current=mountRelicWheel(host.current,window.matchMedia('(prefers-reduced-motion: reduce)').matches,()=>soundRef.current)
      setReady(true)
    }).catch(()=>{if(!cancelled)setWheelError(true)})
    return()=>{cancelled=true;alive.current=false;wheel.current?.destroy();wheel.current=null}
  },[])
  function remember(next:RouletteRequest|null){
    pendingRef.current=next;setPending(next)
    try{if(next)sessionStorage.setItem(storageKey(owner),JSON.stringify(next));else sessionStorage.removeItem(storageKey(owner))}catch{/* A storage failure must not prevent checking an accepted spin. */}
  }
  async function spin(){
    if(locked.current||!state||!ready)return
    locked.current=true;setBusy(true);setConfirm(false);setRewardOpen(false);setError('');setResult(null)
    const request=pendingRef.current??{operation:randomId(),expectedFree:state.freeAvailable}
    remember(request)
    try{
      const receipt=await spinRoulette(request)
      if(!alive.current)return
      const landed=receipt.spin!
      remember(null)
      try{await wheel.current?.spin(landed.grade,landed.operationId)}catch{/* The server receipt remains valid if the canvas fails. */}
      if(alive.current){setResult(landed);setRewardOpen(!!landed.relic);if(sound)playRelicResultSound(landed.operationId,landed.grade!=='none')}
    }catch(cause){
      if(!alive.current)return
      const rejection=rouletteRejection(cause)
      if(rejection){remember(null);setError(rejection);void query.refetch({cancelRefetch:false})}
      else setError('결과를 확인하지 못했어요. 같은 회전 다시 확인을 누르면 추가 차감 없이 결과를 확인해요.')
    }finally{locked.current=false;if(alive.current)setBusy(false)}
  }
  const disabled=busy||rewardOpen||!ready||!state||resetPassed||(!pending&&!state.freeAvailable&&state.gold<state.nextCost)
  return <main className="relic-roulette-page">
    <div className="roulette-layout">
      <section className="roulette-stage" aria-label="유물 룰렛">
        <div className="roulette-stage-top"><button className="roulette-sound" onClick={()=>setSound(!sound)} aria-label={sound?'효과음 끄기':'효과음 켜기'} aria-pressed={sound}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button></div>
        <div className="roulette-canvas" ref={host} role="img" aria-label="꽝 60%, 희귀 34%, 특급 5%, 신화 1%의 네 영역으로 나뉜 유물 룰렛"/>
        {!ready&&<p className="roulette-loading" role="status">{wheelError?'룰렛을 불러오지 못했어요. 새로고침해 주세요.':'운명의 유물판을 준비하고 있어요…'}</p>}
        <section className="roulette-probabilities" aria-label="등급별 당첨 확률"><div className="roulette-odds-grid">{Object.entries(rouletteGrades).map(([grade,details])=><div className="roulette-odds-row" key={grade}><span><i style={{background:details.color}}/>{details.label}</span><strong>{state?.odds[grade as keyof typeof rouletteGrades]??details.chance}<small>%</small></strong></div>)}</div></section>
        <div className="roulette-action-area">
          <button className="roulette-spin" disabled={disabled} onClick={()=>{if(pending||state?.freeAvailable)void spin();else setConfirm(true)}}><RotateCw size={19} className={busy?'roulette-turning':''}/>{busy?'운명의 유물판이 돌아가고 있어요…':pending?'같은 회전 다시 확인':state?.freeAvailable?'오늘의 무료 룰렛 돌리기':'500골드로 룰렛 돌리기'}</button>
          <p className="roulette-reset">매일 한국 시간 00:00 무료 1회</p>
          {state&&!state.freeAvailable&&state.gold<state.nextCost&&!pending&&<p className="roulette-error">추가 회전에는 500골드가 필요해요.</p>}
          {error&&<p className="roulette-error" role="alert">{error}</p>}
          {query.isError&&<div className="roulette-error" role="alert">룰렛 정보를 불러오지 못했어요. <button onClick={()=>void query.refetch()}>다시 불러오기</button></div>}
        </div>
      </section>
    </div>
    <footer className="roulette-notes">같은 등급의 유물은 동일한 확률로 등장해요.<br/>무료 기회는 이월되지 않으며, 중복 유물도 보유 수량에 추가됩니다.</footer>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="유물판을 한 번 더 돌릴까요?" description="500골드를 사용합니다. 꽝이 나와도 사용한 골드는 돌아오지 않아요." confirmLabel="500골드로 돌리기" illustration="game" busy={busy} onConfirm={()=>void spin()}/>
    <RouletteRewardDialog spin={result} open={rewardOpen} onOpenChange={setRewardOpen}/>
  </main>
}
