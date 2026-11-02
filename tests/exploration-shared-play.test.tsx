import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {TestExplorationGame} from '@/features/exploration/test-exploration-game'
import {VerifiedExplorationGame} from '@/features/exploration/verified-exploration-game'
import {newExplorationModel} from '@/features/exploration/server-engine'
import {appQueryClient,accountQueryKey,setQueryAccount} from '@/lib/account-cache'
import {combatTimings} from '@/features/exploration/combat-timing'
import {deepMonsters} from '@/features/exploration/deep-monsters'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {shamanSpells} from '@/features/exploration/shaman-stock'
import {ExplorationPage} from '@/features/exploration/exploration-page'
import {writeFileSync} from 'node:fs'
const invoke=vi.fn()
vi.mock('@/lib/client',()=>({createClient:()=>({functions:{invoke}})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'operator'}}}),getNickname:()=> '탐험퐁이'}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>({operator:true,loading:false})}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:null})}))
vi.mock('@/features/exploration/exploration-feedback',()=>({ExplorationFeedback:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
beforeEach(()=>{setQueryAccount('operator');vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(.99);invoke.mockReset()})
afterEach(()=>{cleanup();appQueryClient.clear();setQueryAccount(null);vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()})
const advance=async(ms:number)=>act(async()=>{await vi.advanceTimersByTimeAsync(ms)})
it('routes the actual lobby test button into shared real-rule play without a server start',async()=>{
 render(<ExplorationPage/>)
 expect(screen.getByRole('button',{name:'실전 (무료)'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'테스트'}))
 await advance(1200)
 expect(screen.getByRole('region',{name:'파라오 지하 탐험'})).toBeTruthy()
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100,000')
 expect(screen.getByRole('button',{name:'포션 보관함'}).querySelectorAll('b')).toHaveLength(2)
 for(const count of screen.getByRole('button',{name:'포션 보관함'}).querySelectorAll('b'))expect(count.textContent).toBe('×10')
 expect(screen.getAllByRole('combobox')).toHaveLength(3)
 expect(invoke).not.toHaveBeenCalled()
})
async function enter(room:string){
 fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:room}})
 fireEvent.click(document.querySelector('.exploration-choice')!)
 fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}))
 await advance(100)
}
it('keeps the shared HUD and descent while giving only test play extra starting supplies',async()=>{
 render(<TestExplorationGame nickname="탐험퐁이" onLeave={()=>{}}/>)
 expect(screen.getByLabelText('지하 1층으로 내려가는 중')).toBeTruthy()
 await advance(1200)
 const testHud=document.querySelector('.exploration-top')!.textContent!.replace('100,000','100')
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100,000')
 expect(screen.getAllByRole('combobox')).toHaveLength(3)
 fireEvent.click(screen.getByRole('button',{name:'주무기 교체'}))
 for(const weapon of explorationWeapons)expect(screen.getByRole('heading',{name:weapon.name,exact:true})).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:/마법/}))
 for(const spell of shamanSpells)expect(screen.getByRole('heading',{name:spell.name,exact:true})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'테스트 물품 받기'})).toBeNull()
 cleanup()
 const id='00000000-0000-0000-0000-000000000123'
 appQueryClient.setQueryData(accountQueryKey('operator',['exploration-run',id]),{id,revision:0,model:newExplorationModel(),rewardGold:0,finishedAt:null,abandoned:false})
 render(<VerifiedExplorationGame runId={id} nickname="탐험퐁이" onLeave={()=>{}}/>)
 expect(screen.getByLabelText('지하 1층으로 내려가는 중')).toBeTruthy()
 await advance(1200)
 expect(document.querySelector('.exploration-top')!.textContent).toBe(testHud)
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100')
 for(const count of screen.getByRole('button',{name:'포션 보관함'}).querySelectorAll('b'))expect(count.textContent).toBe('×0')
 expect(screen.queryByRole('combobox')).toBeNull()
 expect(invoke).not.toHaveBeenCalled()
})
it('enters a selected monster through the real engine and requires explicit turn-by-turn actions',async()=>{
 render(<TestExplorationGame nickname="탐험퐁이" onLeave={()=>{}}/>)
 await advance(1200);await enter('monster:sand-scorpion')
 expect(screen.getByRole('region',{name:'모래 전갈 전투'})).toBeTruthy()
 expect(document.querySelector('.is-encounter-prelude')).toBeTruthy()
 await advance(999);expect(document.querySelector('.is-encounter-prelude')).toBeTruthy()
 await advance(1);expect(document.querySelector('.is-encounter-prelude')).toBeNull()
 const before=(screen.getByRole('progressbar',{name:'모래 전갈 체력'}) as HTMLProgressElement).value
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(0)
 expect(document.querySelector('.exploration-combat')?.getAttribute('data-action')).toBe('attack')
 expect(document.querySelector('main')?.inert).not.toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
 expect(screen.getByRole('button',{name:'공격',exact:true})).toHaveProperty('disabled',true)
 await advance(combatTimings.player)
 expect((screen.getByRole('progressbar',{name:'모래 전갈 체력'}) as HTMLProgressElement).value).toBeLessThan(before)
 await advance(combatTimings.done-combatTimings.player)
 expect(screen.getByRole('button',{name:'공격',exact:true})).toHaveProperty('disabled',false)
 expect(document.querySelector('.exploration-combat')?.getAttribute('data-action')).toBeNull()
 expect(invoke).not.toHaveBeenCalled()
})
it.each(['merchant-hasan','magic-nadim','investigate-wall','chest','rest-oasis','sphinx'])( 'uses the shared %s room flow without making a server request',async(room)=>{
 render(<TestExplorationGame nickname="탐험퐁이" onLeave={()=>{}}/>)
 await advance(1200);await enter(room)
 expect(screen.queryByLabelText('테스트 방 선택')).toBeNull()
 expect(document.querySelector('.exploration-merchant,.exploration-adventure-room')).toBeTruthy()
 expect(screen.queryByRole('alert')).toBeNull()
 expect(invoke).not.toHaveBeenCalled()
})
it.each(deepMonsters)('previews $id through the shared engine without changing live progression',async(monster)=>{
 render(<TestExplorationGame nickname="탐험퐁이" onLeave={()=>{}}/>)
 await advance(1200);await enter(`monster:${monster.id}`)
 expect(screen.getByRole('region',{name:monster.name+' 전투'})).toBeTruthy()
 expect(document.querySelector('.is-encounter-prelude')).toBeTruthy()
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100,000')
 expect(screen.getByRole('progressbar',{name:monster.name+' 체력'})).toHaveProperty('max',monster.maxHp)
 expect(screen.queryByRole('alert')).toBeNull()
 expect(invoke).not.toHaveBeenCalled()
 if(process.env.DEEP_MONSTER_QA){
  await advance(1000)
  const root=encodeURI(process.cwd().replaceAll('\\','/'))
  const html=document.body.innerHTML.replace(/([="(;])\/(exploration|branding|currency|arcade|app-icons)\//g,`$1file:///${root}/public/$2/`)
  writeFileSync(`artifacts/verified-exploration-${monster.id}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`)
 }
})
