import {writeFileSync,readFileSync,readdirSync} from 'node:fs'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import * as practice from '@/features/exploration/practice-state'
import {drawPracticeFloor} from '@/features/exploration/campaign'
import {queueForcedMerchant} from '@/features/exploration/merchant-pity'
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=> <img src="/branding/pongi.png" style={{width:28,height:28}}/>}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
it.skipIf(process.env.EXPLORATION_LAYOUT_QA!=='1')('captures stable player status slots and separate attack and bleeding frames',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(.99);vi.useFakeTimers()
 const fresh=practice.newPractice(()=>0,'practice'),mock=vi.spyOn(practice,'newPractice'),root=process.cwd().replaceAll('\\','/')
 const css=readdirSync('dist/assets').filter(x=>/^(index|exploration-page)-.*\.css$/.test(x)).sort((a,b)=>Number(a.startsWith('exploration'))-Number(b.startsWith('exploration'))).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n').replaceAll('url(./',`url(file:///${root}/dist/assets/`).replaceAll('url(/assets/',`url(file:///${root}/dist/assets/`)
 const capture=(name:string)=>{
  const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replaceAll('http://localhost:3000','').replaceAll('/src/features/exploration/assets/',`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`).replaceAll('/branding/',`file:///${root}/public/branding/`)
  writeFileSync(`artifacts/exploration-status-${name}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}.exploration-status-screen{display:none!important}</style>${html}`)
 }
 for(const name of ['empty','bleed','many'] as const){
  mock.mockReturnValue({...fresh,hp:79,combat:{monsterId:'talisman-lizard',enemyHp:33,turn:0,status:'active'},playerEffects:name==='empty'?[]:name==='bleed'?[{kind:'bleed',amount:3,turns:2}]:[{kind:'bleed',amount:3,turns:2},{kind:'burn',amount:40,turns:2},{kind:'weaken',amount:2,turns:2},{kind:'blind',amount:30,turns:2}]})
  render(<ExplorationGame mode="practice" nickname="퐁이" onLeave={()=>{}}/>);await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
  capture(name)
  if(name==='empty'){fireEvent.click(screen.getByRole('button',{name:'내 상태이상 안내'}));await act(async()=>{await vi.advanceTimersByTimeAsync(100)});capture('guide')}
  if(name==='bleed'){
   fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await act(async()=>{await vi.advanceTimersByTimeAsync(1100)});capture('attack')
   await act(async()=>{await vi.advanceTimersByTimeAsync(900)});capture('tick')
  }
  cleanup()
 }
 vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()
})
it.skipIf(process.env.EXPLORATION_LAYOUT_QA!=='1')('captures the three mandatory single-door entrances',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(0);vi.useFakeTimers()
 const fresh=practice.newPractice(()=>0,'practice'),mock=vi.spyOn(practice,'newPractice'),root=process.cwd().replaceAll('\\','/')
 const css=readdirSync('dist/assets').filter(x=>/^(index|exploration-page)-.*\.css$/.test(x)).sort((a,b)=>Number(a.startsWith('exploration'))-Number(b.startsWith('exploration'))).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n').replaceAll('url(./',`url(file:///${root}/dist/assets/`).replaceAll('url(/assets/',`url(file:///${root}/dist/assets/`)
 for(const floor of [11,34,50]){
  const state={...fresh,market:drawPracticeFloor(floor,()=>0)}
  mock.mockReturnValue(floor===11?queueForcedMerchant(state):state)
  render(<ExplorationGame mode="practice" nickname="퐁이" onLeave={()=>{}}/>);await act(async()=>{await vi.advanceTimersByTimeAsync(100)});await act(async()=>{await vi.advanceTimersByTimeAsync(2500)})
  expect(screen.getByRole('group',{name:`지하 ${floor}층의 하나뿐인 문`}).querySelectorAll('button')).toHaveLength(1)
  const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replaceAll('http://localhost:3000','').replaceAll('/src/features/exploration/assets/',`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`).replaceAll('/branding/',`file:///${root}/public/branding/`)
  writeFileSync(`artifacts/exploration-single-door-${floor}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`)
  cleanup()
 }
 vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()
})
it.skipIf(process.env.EXPLORATION_LAYOUT_QA!=='1')('captures layout for browser review',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(0);vi.useFakeTimers()
 const fresh=practice.grantPracticeSupplies(practice.newPractice(()=>0));vi.spyOn(practice,'newPractice').mockImplementation(()=>({...fresh,hp:79,mp:20,potions:{health:3,mana:2},equippedSpells:['ember','ripple']}))
 const root=process.cwd().replaceAll('\\','/')
 const css=readdirSync('dist/assets').filter(x=>/^(index|exploration-page)-.*\.css$/.test(x)).sort((a,b)=>Number(a.startsWith('exploration'))-Number(b.startsWith('exploration'))).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n')
 for(const mode of ['doors','monster','soul-lantern']){
  render(<ExplorationGame nickname="Pongi" onLeave={()=>{}}/>);await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
  if(mode!=='doors'){fireEvent.change(document.querySelector('select')!,{target:{value:mode}});fireEvent.click(document.querySelector('.exploration-choice')!);fireEvent.click(document.querySelector('.exploration-preview-enter')!);for(let i=0;i<3;i++)await act(async()=>{await vi.advanceTimersByTimeAsync(100)})}
  else fireEvent.click(document.querySelectorAll('.exploration-choice')[1])
  await act(async()=>{await vi.advanceTimersByTimeAsync(6000)});
  let html=document.body.innerHTML.replaceAll('data-starting-style=""','').replaceAll('http://localhost:3000','').replaceAll('/src/features/exploration/assets/',`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`).replaceAll('/branding/',`file:///${root}/public/branding/`)
  writeFileSync(`artifacts/quickslots-${mode}-static.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`);cleanup()
 }
 vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()
})

it.skipIf(process.env.EXPLORATION_LAYOUT_QA!=='1')('captures ordinary and boss combat for responsive browser review',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(.5);vi.useFakeTimers()
 const fresh=practice.newPractice(()=>0,'practice'),mock=vi.spyOn(practice,'newPractice')
 const root=process.cwd().replaceAll('\\','/')
 const css=readdirSync('dist/assets').filter(x=>/^(index|exploration-page)-.*\.css$/.test(x)).sort((a,b)=>Number(a.startsWith('exploration'))-Number(b.startsWith('exploration'))).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n')
 for(const [name,monsterId,enemyHp,turn] of [['normal','talisman-lizard',11,2],['boss','golden-pharaoh',220,0],['sentinel','hourglass-sentinel',75,0],['fox','night-eyed-desert-fox',36,0],['bat','sand-wing-bat',28,0],['jellyfish','tomb-lantern-jellyfish',65,0],['warden','nameless-royal-warden',120,0],['anubis','obsidian-anubis',100,0]] as const){
  vi.mocked(Math.random).mockReturnValue((name==='fox'||name==='bat') ? .1 : .5)
  mock.mockReturnValue({...fresh,hp:89,mp:30,spells:practice.practiceSpells,equippedSpells:['ember','tide'],potions:{health:3,mana:2},combat:{monsterId,enemyHp,turn,status:'active',...(name==='sentinel'?{pattern:{charging:true}}:{})}})
  render(<ExplorationGame mode="practice" nickname="퐁이" onLeave={()=>{}}/>)
  await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
  const capture=(suffix:string)=>{
  const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replaceAll('http://localhost:3000','').replaceAll('/src/features/exploration/assets/',`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`).replaceAll('/branding/',`file:///${root}/public/branding/`)
  const fonts=css.replaceAll('url(./',`url(file:///${root}/dist/assets/`).replaceAll('url(/assets/',`url(file:///${root}/dist/assets/`)
  writeFileSync(`artifacts/exploration-ui-${suffix}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}.combat-reply-number,.combat-impact-screen,.combat-enemy-hit{display:none!important}</style>${html}`)
  }
  if(name==='sentinel'||name==='jellyfish'||name==='warden'||name==='anubis'){capture(name);cleanup();continue}
  capture(`${name}-ready`)
  fireEvent.click(document.querySelector('.combat-action-attack')!)
  await act(async()=>{await vi.advanceTimersByTimeAsync(1100)})
  if(name==='normal')capture('normal-player')
  await act(async()=>{await vi.advanceTimersByTimeAsync(6000)})
  await act(async()=>{await vi.advanceTimersByTimeAsync(600)})
  if(name==='normal')expect(document.querySelector('.combat-result-log')).toBeTruthy()
  capture(name)
  if(name==='normal'){
   for(const [label,suffix] of [['주무기 교체','gear'],['기본 공격 · 꼬리치기 설명','enemy-info'],['능력치 아이콘 안내','player-info'],['탐험 메뉴','menu']]){
    fireEvent.click(screen.getByRole('button',{name:label,exact:true}))
    await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
    capture(suffix)
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
   }
   fireEvent.click(document.querySelector('.exploration-monster-move.is-magic')!)
   await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
   capture('enemy-magic')
  }
  if(name==='boss'){
   fireEvent.click(document.querySelector('.exploration-monster-magic-list button:last-child')!)
   await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
   capture('enemy-bleed')
  }
  cleanup()
 }
 vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()
})
