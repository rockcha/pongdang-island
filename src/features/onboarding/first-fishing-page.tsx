import {useEffect,useRef,useState} from 'react'
import {useNavigate} from 'react-router'
import {Check,ChevronRight,Fish,House} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {CollectiblePreview} from '@/features/collection/collectible-preview'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {TensionFishingGame} from '@/features/fishing/tension-fishing-game'
import {TankInhabitants} from '@/features/aquarium/tank-inhabitants'
import {AquariumBackdrop} from '@/features/aquarium/aquarium-backdrop'
import {themePanoramaUrl} from '@/features/aquarium/theme-panorama'
import {usePwaUpdateBlock} from '@/features/pwa/update-blockers'
import {useFirstFishingTutorial} from './first-fishing-gate'
import {tutorialError} from './api'
import type {TutorialAction} from './api'

export function FirstFishingPage(){
 const {state,act}=useFirstFishingTutorial(),navigate=useNavigate()
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[claimPending,setClaimPending]=useState(false)
 const [storage,setStorage]=useState(false),[selected,setSelected]=useState(false)
 const locked=useRef(false),mounted=useRef(true)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 usePwaUpdateBlock(state.required)
 const species=state.species
 if(!species)return null
 const step=state.step==='completed'?3:state.step==='caught'?2:1
 async function run(action:TutorialAction){
  if(locked.current)return
  locked.current=true;setBusy(true);setError('')
  try{await act(action)}catch(error){if(mounted.current)setError(tutorialError(error))}
  finally{locked.current=false;if(mounted.current)setBusy(false)}
 }
 const background=state.aquarium?.catalog.find(item=>item.id===state.tank?.background_id),panorama=themePanoramaUrl(background?.image_path)
 return <section aria-label="첫 낚시 튜토리얼" className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
  <header className="shrink-0 border-b px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
   <p className="text-[11px] tracking-widest text-primary">퐁당섬의 첫 바다 친구</p>
   <ol aria-label="첫 낚시 진행" className="mt-3 flex items-center gap-2 text-xs">{['첫 낚시','어항에 넣기','함께 시작'].map((label,index)=><li key={label} aria-current={step===index+1?'step':undefined} className={`flex min-w-0 flex-1 items-center gap-1.5 ${step>=index+1?'text-primary':'text-muted-foreground'}`}><span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] ${step>=index+1?'bg-primary text-primary-foreground':'bg-secondary'}`}>{step>index+1?<Check className="size-3"/>:index+1}</span><span className="truncate">{label}</span></li>)}</ol>
  </header>
  {state.step==='fishing'&&!claimPending&&!failed?<>
   <p className="shrink-0 px-4 py-3 text-center text-xs leading-5 text-primary">입질이 오면 시작해요.<br/>게이지가 낮으면 꾹 누르고, 높아지면 손을 떼세요.</p>
   <div className="relative min-h-0 flex-1"><TensionFishingGame key={attempt} castId={`first-fishing-${attempt}`} challenge={{rarity:'common',wait:2,confirmBite:true}} regionId="pongdang" quiet guided outline={species} onCancel={()=>{}} onCaught={()=>{setClaimPending(true);void run('catch')}} onFailed={()=>setFailed(true)}/></div>
  </>:<div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-5 py-5 text-center [&>:first-child]:mt-auto [&>:last-child]:mb-auto">
   {state.step==='ready'?<><img src="/branding/pongi-welcome.png" alt="" className="w-40 max-h-[25dvh] object-contain"/><h1 className="text-xl">첫 낚시를 해볼까요?</h1><p className="text-sm leading-6 text-muted-foreground">먼저 바다 친구 한 마리를 만나고<br/>우리 어항에 데려와 봐요.</p><span className="rounded-full bg-secondary px-3 py-1.5 text-xs text-primary">미끼·골드 없이 연습할 수 있어요</span></>:state.step==='fishing'?<><Fish className="size-12 text-primary"/><h1 className="text-lg">{failed?'괜찮아요, 다시 해봐요':'첫 친구를 만났어요!'}</h1><p className="text-sm leading-6 text-muted-foreground">{failed?'릴을 꾹 누르면 올라가고, 손을 떼면 내려가요.':'첫 친구를 보관함으로 데려오는 중이에요.'}</p><p className="text-xs text-primary">다시 시도해도 미끼와 골드는 줄어들지 않아요.</p></>:state.step==='caught'&&!storage?<><div className="flex aspect-square w-full max-w-64 min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-blue-50 p-4"><CollectiblePreview species={species} large/></div><h1 className="text-xl">{species.name} 획득!</h1><p className="text-sm leading-6 text-muted-foreground">첫 친구가 보관함에서 기다리고 있어요.<br/>이제 어항에 데려가 볼까요?</p></>:state.step==='caught'?<><h1 className="text-lg">보관함에서 어항으로</h1><p className="text-xs leading-5 text-muted-foreground">물고기를 선택하고 아래의<br/>‘어항에 넣기’를 눌러주세요.</p><button type="button" aria-label={`${species.name} 선택`} aria-pressed={selected} onClick={()=>setSelected(value=>!value)} disabled={busy} className={`relative flex w-full max-w-64 flex-col items-center gap-2 rounded-2xl border-2 px-5 py-4 ${selected?'border-primary bg-secondary/50':'border-border bg-card'}`}><span className={`absolute left-3 top-3 grid size-5 place-items-center rounded-full border ${selected?'border-primary bg-primary text-primary-foreground':'border-border'}`}>{selected&&<Check className="size-3"/>}</span><span className="absolute right-3 top-3 text-xs text-primary">×1</span><CollectibleThumbnail path={species.thumbnail_path} name={species.name} className="size-20"/><span className="text-sm">{species.name}</span></button><p className="flex items-center justify-center gap-2 text-xs text-primary"><House className="size-4"/>{state.tank?.name??'나의 첫 어항'}</p></>:<><span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Check/></span><h1 className="text-xl">첫 바다 친구가 생겼어요!</h1><div className="relative aspect-[15/8] w-full shrink-0 overflow-hidden rounded-2xl bg-blue-100"><TankInhabitants preview items={state.item?[state.item]:[]} world={panorama?{columns:3,overview:true,initialZoom:1/3,initialView:0,canPan:()=>false}:undefined} scenery={<AquariumBackdrop background={background} panorama={panorama?{src:panorama,view:0,zoom:1/3}:undefined}/>}/></div><p className="text-sm leading-6 text-muted-foreground">{species.name}가 어항에 들어갔어요.<br/>이제 자유롭게 낚시하고 어항을 꾸며보세요.</p></>}
  </div>}
  {error&&<p role="alert" className="shrink-0 px-5 pb-2 text-center text-xs leading-5 text-destructive">{error}</p>}
  <footer className="shrink-0 border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
   {state.step==='ready'?<Button className="min-h-12 w-full" disabled={busy} onClick={()=>void run('start')}><Fish className="size-4"/>{busy?'준비 중…':'첫 낚시 시작'}</Button>:state.step==='fishing'?claimPending?<Button className="min-h-12 w-full" disabled={busy} onClick={()=>void run('catch')}>{busy?'첫 친구를 데려오는 중…':'획득 다시 확인'}</Button>:failed?<Button className="min-h-12 w-full" onClick={()=>{setFailed(false);setAttempt(value=>value+1)}}>다시 도전하기</Button>:<p className="py-2 text-center text-xs text-muted-foreground">천천히 해도 괜찮아요. 첫 낚시는 무료예요.</p>:state.step==='caught'?<Button className="min-h-12 w-full" disabled={busy||(storage&&!selected)} onClick={()=>storage?void run('place'):setStorage(true)}>{busy?'어항으로 데려가는 중…':storage?'어항에 넣기':'첫 어항에 데려가기'}<ChevronRight className="size-4"/></Button>:<Button className="min-h-12 w-full" onClick={()=>navigate('/aquarium',{replace:true})}>내 어항 보러 가기<ChevronRight className="size-4"/></Button>}
  </footer>
 </section>
}
