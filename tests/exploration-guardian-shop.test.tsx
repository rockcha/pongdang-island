import {useState} from 'react'
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {newPractice,type PracticeState} from '@/features/exploration/practice-state'
import * as practice from '@/features/exploration/practice-state'
import {MerchantRoom} from '@/features/exploration/merchant-room'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import {advanceExploration,meetNameGuardian,needsNameGuardian,finishNameGuardian,enterBossOasis} from '@/features/exploration/run-state'
import {progressNameStory} from '@/features/exploration/name-story'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {drawPracticeFloor} from '@/features/exploration/campaign'
import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()})
const advance=async(ms:number)=>{await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
function floor34():PracticeState{const state=newPractice(()=>.9,'practice');return {...state,market:drawPracticeFloor(34,()=>.9)}}
function capture(name:string){if(!process.env.GUARDIAN_SHOP_QA)return;const root=process.cwd().replaceAll('\\','/'),css=readdirSync('dist/assets').filter(x=>/^(index|exploration-page)-.*\.css$/.test(x)).sort((a,b)=>Number(a.startsWith('exploration'))-Number(b.startsWith('exploration'))).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n'),html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`);writeFileSync(`artifacts/guardian-shop-${name}.html`,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0}*,*::before,*::after{animation:none!important;transition:none!important}</style>${html}`)}
it('blocks floor 34 progression until the mandatory guardian is met and resolved',()=>{
 const initial=floor34();expect(needsNameGuardian(initial)).toBe(true);expect(advanceExploration(initial)).toBe(initial)
 expect(initial.market.doors).not.toContain('nameless-guardian')
 const met=meetNameGuardian(initial);expect(met.guardianCheckpoint).toBe(true);expect(finishNameGuardian(met)).toBe(met);expect(advanceExploration(met)).toBe(met)
 const opened=progressNameStory(progressNameStory(met,'restore'),'open-gate'),finished=finishNameGuardian(opened)
 expect(finished.market.floor).toBe(34);expect(finished.guardianCheckpoint).toBe(false);expect(needsNameGuardian(finished)).toBe(false)
 expect(advanceExploration(finished).market.floor).toBe(35)
})
it('requires hostile guardian loot and the oasis before returning to the same floor doors',()=>{
 const state=startMonsterCombat(meetNameGuardian(floor34()),'nameless-royal-warden'),won=resolveCombatTurn({...state,combat:{...state.combat!,enemyHp:1}},{type:'attack'},()=>.99).state
 expect(finishNameGuardian(won)).toBe(won)
 const claimed={...won,combat:{...won.combat!,lootClaimed:true}};expect(finishNameGuardian(claimed)).toBe(claimed)
 const done=finishNameGuardian(enterBossOasis(claimed));expect(done.guardianCheckpoint).toBe(false);expect(done.market.floor).toBe(34)
})
it.each([false,true])('automatically presents the guardian before doors, with friendly history = %s',async friendly=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}));const initial={...floor34(),...(friendly?{nameStory:{choice:'restored' as const}}:{})}
 vi.spyOn(practice,'newPractice').mockImplementation(()=>initial)
 render(<ExplorationGame mode="practice" nickname="탐험가" onLeave={()=>{}}/>);await advance(100)
 expect(screen.queryByRole('group',{name:'지하 34층의 세 문'})).toBeNull();expect(screen.getByRole('region',{name:'탐험 방 · 이름 없는 왕실 수문장'})).toBeTruthy()
 if(friendly){fireEvent.click(screen.getByRole('button',{name:'그가 지키던 문에 대해 묻는다'}));fireEvent.click(screen.getByRole('button',{name:'유품을 남겨두고 떠난다'}));expect(screen.getByRole('group',{name:'지하 34층의 세 문'})).toBeTruthy();expect(screen.queryByRole('button',{name:'수문장과 싸운다'})).toBeNull()}
 else expect(screen.getByRole('button',{name:'수문장과 싸운다'})).toBeTruthy()
})
it('compares equipment deltas, price, remaining gold and capacity, then buys without auto-equipping',()=>{
 const initial=newPractice(()=>0);let latest=initial;const equipped=vi.fn()
 function Shop(){const [state,setState]=useState(initial);latest=state;return <MerchantRoom state={state} onChange={setState} onDescend={()=>{}} onTalk={()=>{}} onEquipChange={equipped}/>}
 render(<Shop/>);fireEvent.click(screen.getByRole('button',{name:'구매한다'}));fireEvent.click(screen.getAllByRole('button',{name:/능력치 비교/})[0]);capture('comparison')
 const panel=screen.getByRole('region',{name:'장비 능력치 비교'});expect(panel.textContent).toContain('+3');expect(panel.textContent).toContain('-1%p')
 expect(screen.getByLabelText('구매 정보').textContent).toContain('1/3 → 2/3')
 fireEvent.click(screen.getByRole('button',{name:'취소'}));expect(latest).toBe(initial)
 fireEvent.click(screen.getAllByRole('button',{name:/능력치 비교/})[0]);fireEvent.click(screen.getByRole('button',{name:/보관함에 구매 ·/}))
 expect(latest.weapons).toHaveLength(2);expect(latest.weaponId).toBe(initial.weaponId);expect(latest.gold).toBeLessThan(initial.gold)
 fireEvent.click(screen.getByRole('button',{name:'장착하기'}));expect(latest.weaponId).not.toBe(initial.weaponId);expect(equipped).toHaveBeenCalledOnce()
})
