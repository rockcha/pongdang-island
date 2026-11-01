import {practiceFinalFloor,practiceFinalBossRoom} from '@/features/exploration/campaign'
import {finalBossBalance} from '@/features/exploration/campaign-balance'
import {combatTimings} from '@/features/exploration/combat-timing'
﻿import {StrictMode} from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {ExplorationPage} from '@/features/exploration/exploration-page'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import * as practice from '@/features/exploration/practice-state'
import * as campaign from '@/features/exploration/campaign'
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>({operator:true,loading:false})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'operator'}}}),getNickname:()=> '탐험퐁이'}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:{avatar_path:null}})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=> <img src="/branding/pongi.png" style={{width:28,height:28}}/>}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-feedback',()=>({ExplorationFeedback:()=> <section aria-label="탐험 피드백"/>}))
vi.mock('@/features/exploration/reward-api',()=>({commandExploration:vi.fn(async(request:any)=>({id:request.runId,abandoned:false,finishedAt:null}))}))
vi.mock('@/features/exploration/verified-exploration-game',()=>({VerifiedExplorationGame:(props:any)=><ExplorationGame {...props} mode="practice"/>}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){},startQuizClock(){},stopQuizClock(){}})}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()})
async function advance(ms:number){await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
function setup(){vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(0);vi.useFakeTimers()}
it('changes door and monster narration on the next floor even when randomness repeats',async()=>{
 setup()
 const fresh=practice.newPractice(()=>0),strong={...fresh,weapons:fresh.weapons.map(item=>({...item,attack:500}))}
 vi.spyOn(practice,'newPractice').mockImplementation(()=>strong)
 render(<ExplorationGame nickname="탐험퐁이" onLeave={()=>{}}/>);await advance(100)
 const firstDoorLine=screen.getByLabelText('탐험 로그').textContent
 async function enterCobra(){
  fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:'monster:lapis-cobra'}})
  fireEvent.click(document.querySelectorAll('.exploration-choice')[0]);fireEvent.click(document.querySelector('.exploration-preview-enter')!)
  await advance(100);await advance(100);await advance(100)
  expect(screen.getByRole('region',{name:'청금석 코브라 전투'})).toBeTruthy()
  return screen.getByLabelText('탐험 로그').textContent
 }
 const firstMonsterLine=await enterCobra()
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(4300);await advance(3000)
 fireEvent.click(screen.getByRole('button',{name:'아래층으로 내려간다.'}));await advance(100)
 expect(screen.getByLabelText('탐험 로그').textContent).not.toBe(firstDoorLine)
 expect(await enterCobra()).not.toBe(firstMonsterLine)
})
it('replaces a selected rest door after a potion fills both resources',async()=>{
 setup()
 const fresh=practice.newPractice(()=>0,'practice'),initial={...fresh,hp:85,potions:{health:1,mana:0},market:{...fresh.market,floor:19,doors:['monster','rest-oasis','warning-wall'] as typeof fresh.market.doors,monsterIds:['sand-scorpion','random','random'] as typeof fresh.market.monsterIds}}
 vi.spyOn(practice,'newPractice').mockImplementation(()=>initial)
 render(<ExplorationGame mode="practice" nickname="탐험퐁이" onLeave={()=>{}}/>);await advance(100)
 fireEvent.click(document.querySelectorAll('.exploration-choice')[1])
 expect(screen.getByRole('button',{name:'선택한 문으로 입장'})).toHaveProperty('disabled',false)
 fireEvent.click(screen.getByRole('button',{name:'포션 보관함'}));fireEvent.click(screen.getByRole('button',{name:'체력 포션 마시기'}));await advance(100)
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',100)
 expect(screen.getByRole('button',{name:'문을 선택해주세요'})).toHaveProperty('disabled',true)
 // Selecting the same slot now enters a useful event, rather than the obsolete rest.
 fireEvent.click(document.querySelectorAll('.exploration-choice')[1]);fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}));await advance(100)
 expect(screen.queryByRole('button',{name:'쉬었다 간다 · 체력·마나 전부 회복'})).toBeNull()
})
it('announces death only when the lethal counterattack and HP loss are shown',async()=>{
 setup();vi.mocked(Math.random).mockReturnValue(.99)
 const fresh=practice.newPractice(()=>0),initial={...fresh,hp:1,combat:{monsterId:'ancient-giant' as const,enemyHp:115,turn:0,status:'active' as const}}
 vi.spyOn(practice,'newPractice').mockImplementation(()=>initial)
 render(<ExplorationGame nickname="탐험퐁이" onLeave={()=>{}}/>);await advance(100)
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(combatTimings.player)
 expect(screen.queryByText('사망하였습니다.')).toBeNull();expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',1)
 await advance(combatTimings.reply-combatTimings.player-1);expect(screen.queryByText('사망하였습니다.')).toBeNull()
 await advance(1);expect(screen.getByText('사망하였습니다.')).toBeTruthy();expect(screen.getByRole('button',{name:'메인 화면으로'})).toBeTruthy()
})
it('offers test and real practice as distinct starts, with selects and supplies only in test mode',async()=>{
 setup();render(<ExplorationPage/>);capture('mode-lobby')
 expect(screen.getByRole('button',{name:'실전 (무료)'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'테스트'}));await advance(100)
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100,000');expect(screen.getAllByRole('combobox')).toHaveLength(3);capture('test-doors')
 cleanup();render(<ExplorationPage/>);fireEvent.click(screen.getByRole('button',{name:'실전 (무료)'}));await advance(100);await advance(100)
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100');expect(document.querySelector('.exploration-potion-loadout>div>span:nth-child(1)')?.textContent).toBe('×0');expect(document.querySelector('.exploration-potion-loadout>div>span:nth-child(2)')?.textContent).toBe('×0');expect(screen.queryByRole('combobox')).toBeNull()
 expect(document.querySelectorAll('.exploration-choice')).toHaveLength(3);await advance(1800);capture('practice-doors')
 fireEvent.click(screen.getByRole('button',{name:'주무기 교체'}))
 expect(screen.queryByRole('button',{name:'테스트 물품 받기'})).toBeNull()
})
it('plays fifty actual UI floors and requires the final boss before completion',async()=>{
 // Controlled safe route tests navigation, without relying on removed room-revealing door clues.
 vi.spyOn(campaign,'refreshPracticeDoors').mockImplementation(state=>state)
 vi.spyOn(campaign,'drawPracticeFloor').mockImplementation(floor=>({floor,doors:['monster','rest-oasis',floor===50?'boss-pharaoh':'warning-wall'],monsterIds:['sand-scorpion','random','random'],weaponIds:[],armorIds:[]}))
 setup();const fresh=practice.newPractice(()=>0,'practice');vi.spyOn(practice,'newPractice').mockImplementation(()=>({...fresh,nameStory:{choice:'restored'}}));const leave=vi.fn();render(<StrictMode><ExplorationGame mode="practice" nickname="탐험퐁이" onLeave={leave}/></StrictMode>);await advance(100)
 for(let floor=1;floor<=practiceFinalFloor;floor++){
  if(floor===34){fireEvent.click(screen.getByRole('group',{name:'지하 34층의 하나뿐인 문'}).querySelector('button')!);fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}));await advance(100);fireEvent.click(screen.getByRole('button',{name:'그가 지키던 문에 대해 묻는다'}));fireEvent.click(screen.getByRole('button',{name:'유품을 남겨두고 떠난다'}));await advance(100)}
  if(screen.queryByRole('group',{name:`지하 ${floor}층의 하나뿐인 문`})){
   fireEvent.click(screen.getByRole('group',{name:`지하 ${floor}층의 하나뿐인 문`}).querySelector('button')!);fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}));await advance(100)
   if(floor===practiceFinalFloor){await advance(100);await advance(100);break}
  }
  if(screen.queryByRole('button',{name:'문으로 돌아간다'})){fireEvent.click(screen.getByRole('button',{name:'문으로 돌아간다'}));await advance(6000)}
  expect(screen.getByRole('group',{name:`지하 ${floor}층의 세 문`})).toBeTruthy()
  const safe=document.querySelectorAll<HTMLButtonElement>('.exploration-choice')[1]
  expect(safe).toBeTruthy();fireEvent.click(safe!);fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}));await advance(100)
  const skip=screen.queryByRole('button',{name:'그냥 지나간다'})??screen.queryByRole('button',{name:'구매하지 않고 지나간다'})??screen.queryByRole('button',{name:'배우지 않고 내려간다'})
  expect(skip).toBeTruthy();fireEvent.click(skip!);await advance(6000);await advance(100)
 }
 await advance(100);expect(screen.getByRole('region',{name:'황금왕 라세프 전투'})).toBeTruthy();expect(screen.queryByRole('heading',{name:'50층 탐험 완료'})).toBeNull();expect(screen.queryByRole('group',{name:'지하 51층의 세 문'})).toBeNull()
 for(let turn=0;turn<20&&screen.queryByRole('button',{name:'공격',exact:true});turn++){fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(6200)}
 expect(screen.queryByRole('heading',{name:'50층 탐험 완료'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'메인 화면으로'}));expect(leave).toHaveBeenCalledOnce()
},45000)
it('renders the final boss and completes only after victory and claiming its reward',async()=>{
 setup();const fresh=practice.newPractice(()=>0,'practice'),initial={...fresh,weapons:fresh.weapons.map(item=>({...item,attack:500})),market:{...fresh.market,floor:practiceFinalFloor,doors:['monster',practiceFinalBossRoom,'rest-oasis'] as typeof fresh.market.doors,monsterIds:['sand-scorpion','random','random'] as typeof fresh.market.monsterIds}}
 vi.spyOn(practice,'newPractice').mockImplementation(()=>initial)
 render(<ExplorationGame mode="practice" nickname="탐험퐁이" onLeave={()=>{}}/>);await advance(100)
 const finalDoor=screen.getByRole('group',{name:'지하 50층의 하나뿐인 문'})
 expect(finalDoor.querySelectorAll('button')).toHaveLength(1)
 fireEvent.click(finalDoor.querySelector('button')!);fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}));await advance(100);await advance(100);await advance(100)
 expect(screen.getByRole('progressbar',{name:'황금왕 라세프 체력'})).toHaveProperty('max',finalBossBalance.hp)
 expect((document.querySelector('.exploration-scene') as HTMLElement).style.backgroundImage).toContain('rasef-sun-throne.webp');expect(screen.queryByRole('button',{name:/^도망/})).toBeNull();expect(document.querySelector('.exploration-monster-tier')).toBeNull();capture('practice-boss50');expect(document.querySelector('[data-combat-background]')?.getAttribute('data-combat-background')).toBe('rasef-sun-throne')
 fireEvent.click(screen.getByRole('button',{name:'마법 · 태양 심판 설명'}));expect(screen.getByRole('dialog').textContent).toContain('마법 저항력을 10 감소');capture('practice-solar-detail');fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});await advance(1)
 fireEvent.click(screen.getByRole('button',{name:'마법 · 황금 사슬 설명'}));expect(screen.getByRole('dialog').textContent).toContain('피해 4, 3턴');capture('practice-chain-detail');fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});await advance(1)
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(1100);await advance(1900);await advance(1300);await advance(2800)
 fireEvent.click(screen.getByRole('button',{name:/보관함에 넣기|교체해서 보관/}));fireEvent.click(screen.getByRole('button',{name:'탐험을 마친다'}))
 expect(screen.getByRole('heading',{name:'50층 탐험 완료'})).toBeTruthy();capture('practice-complete')
})
function capture(id:string){
 if(!process.env.CAMPAIGN_LAYOUT_QA)return
 const root=process.cwd().replaceAll('\\','/'),css=readdirSync('dist/assets').filter(x=>/^(index|exploration-page)-.*\.css$/.test(x)).sort((a,b)=>Number(a.startsWith('exploration'))-Number(b.startsWith('exploration'))).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n').replaceAll('url(./',`url(file:///${root}/dist/assets/`).replaceAll('url(/assets/',`url(file:///${root}/dist/assets/`)
 const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/(?:http:\/\/localhost:\d+)?\/src\/features\/exploration\/assets\//g,`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`).replaceAll('/branding/',`file:///${root}/public/branding/`).replace(/([="(;])\/regions\//g,`$1file:///${root}/public/regions/`).replace(/([="(;])\/(arcade|game-art|app-icons|currency)\//g,`$1file:///${root}/public/$2/`)
 writeFileSync(`artifacts/campaign-${id}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}.exploration-arcade-lobby{height:100dvh!important}</style>${html}`)
}

it('replaces legacy final-floor alternatives with a single direct boss entrance',async()=>{
 setup();const fresh=practice.newPractice(()=>0,'practice'),initial={...fresh,market:{...fresh.market,floor:practiceFinalFloor,doors:['monster','rest-oasis',practiceFinalBossRoom] as typeof fresh.market.doors,monsterIds:['sand-scorpion','random','random'] as typeof fresh.market.monsterIds}}
 vi.spyOn(practice,'newPractice').mockImplementation(()=>initial)
 render(<ExplorationGame mode="practice" nickname="탐험퐁이" onLeave={()=>{}}/>);await advance(100)
 fireEvent.click(document.querySelectorAll('.exploration-choice')[0]);fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}));await advance(100);await advance(100);await advance(100)
 expect(screen.queryByRole('button',{name:'도망 35%'})).toBeNull()
 expect(screen.queryByRole('region',{name:'모래 전갈 전투'})).toBeNull()
 expect(screen.queryByRole('heading',{name:'50층 탐험 완료'})).toBeNull()
 expect(screen.getByRole('region',{name:'황금왕 라세프 전투'})).toBeTruthy()
 await advance(10000);expect(screen.getByRole('region',{name:'황금왕 라세프 전투'})).toBeTruthy();expect(screen.queryByRole('heading',{name:'50층 탐험 완료'})).toBeNull()
})

it('resolves one nonlethal practice turn without restarting its animation timers on resource updates',async()=>{
 setup();const fresh=practice.newPractice(()=>0,'practice'),initial={...fresh,market:{...fresh.market,doors:['monster','rest-oasis','warning-wall'] as typeof fresh.market.doors,monsterIds:['sand-scorpion','random','random'] as typeof fresh.market.monsterIds}}
 vi.spyOn(practice,'newPractice').mockImplementation(()=>initial)
 render(<ExplorationGame mode="practice" nickname="탐험퐁이" onLeave={()=>{}}/>);await advance(100)
 fireEvent.click(document.querySelectorAll('.exploration-choice')[0]);fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}));await advance(100);await advance(100);await advance(100)
 vi.spyOn(Math,'random').mockReturnValue(.5)
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(1100)
 expect(screen.getByRole('progressbar',{name:'모래 전갈 체력'})).toHaveProperty('value',29)
 await advance(1900);await advance(1300)
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',94)
 await advance(1900)
 expect(screen.getByRole('button',{name:'공격',exact:true})).toHaveProperty('disabled',false)
 expect(screen.getByRole('progressbar',{name:'모래 전갈 체력'})).toHaveProperty('value',29)
})
