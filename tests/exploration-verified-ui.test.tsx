import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {appQueryClient,accountQueryKey,setQueryAccount} from '@/lib/account-cache'
import {VerifiedExplorationGame} from '@/features/exploration/verified-exploration-game'
import {applyExplorationAction,newExplorationModel} from '@/features/exploration/server-engine'
import {commandExploration,type ExplorationReceipt} from '@/features/exploration/reward-api'
import {existsSync,readdirSync,writeFileSync} from 'node:fs'
import {startMonsterCombat} from '@/features/exploration/combat-state'
import {combatTimings} from '@/features/exploration/combat-timing'
import {getAdventureRoom} from '@/features/exploration/adventure-rooms'
import {monsterArrivalLines} from '@/features/exploration/exploration-narration'
const invoke=vi.fn(),id='00000000-0000-0000-0000-000000000123'
vi.mock('@/lib/client',()=>({createClient:()=>({functions:{invoke:(...args:any[])=>invoke(...args)}})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'one'}}})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
beforeEach(()=>{setQueryAccount('one');invoke.mockReset();vi.stubGlobal('matchMedia',()=>({matches:true}))})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear();vi.unstubAllGlobals();vi.useRealTimers()})
const seed=(model=newExplorationModel(()=>0)):ExplorationReceipt=>{const data={id,revision:0,model,rewardGold:0,finishedAt:null,abandoned:false};appQueryClient.setQueryData(accountQueryKey('one',['exploration-run',id]),data);return data}
it('sends only the selected action and keeps an uncertain request ID for explicit retry',async()=>{
 const model=newExplorationModel(()=>0);model.state.market.doors=['rest-oasis'];const original=seed(model)
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 await waitFor(()=>expect(screen.queryByLabelText('지하 1층으로 내려가는 중')).toBeNull(),{timeout:2500})
 capture('doors')
 fireEvent.click(document.querySelector('.exploration-choice')!)
 invoke.mockResolvedValueOnce({error:{message:'network offline'},data:null})
 fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}))
 await screen.findByRole('button',{name:'같은 요청 다시 확인'})
 const first=invoke.mock.calls[0][1].body
 expect(first.action).toEqual({type:'door',index:0})
 expect(Object.keys(first).sort()).toEqual(['action','operationId','revision','runId'])
 expect(appQueryClient.getQueryData(accountQueryKey('one',['exploration-run',id]))).toEqual(original)
 const next={...original,revision:1,model:applyExplorationAction(model,{type:'door',index:0},0,()=>0)}
 invoke.mockResolvedValueOnce({data:next,error:null})
 fireEvent.click(screen.getByRole('button',{name:'같은 요청 다시 확인'}))
 await screen.findByRole('button',{name:'쉬고 저장하기'})
 capture('rest')
 expect(invoke.mock.calls[1][1].body).toEqual(first)
})
it('publishes the server-confirmed completion and invalidates the wallet only after payment',async()=>{
 const original=seed(),key=accountQueryKey('one','wallet')
 appQueryClient.setQueryData(key,{gold:100})
 let resolve!:(v:any)=>void;invoke.mockReturnValueOnce(new Promise(r=>resolve=r))
 const completed={...original,revision:1,rewardGold:4000,finishedAt:new Date().toISOString(),model:{...original.model,state:{...original.model.state,completed:true}}}
 const task=commandExploration({runId:id,operationId:crypto.randomUUID(),revision:0,action:{type:'descend'}})
 expect(appQueryClient.getQueryState(key)?.isInvalidated).toBe(false)
 expect(appQueryClient.getQueryData(key)).toEqual({gold:100})
 await act(async()=>{resolve({data:completed,error:null});await task})
 expect(appQueryClient.getQueryState(key)?.isInvalidated).toBe(true)
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 expect(screen.getByRole('status').textContent).toBe('80층 보상 2,000골드 · 누적 4,000골드 지급 완료')
 capture('complete')
})
it('renders the authoritative final boss with the combat controls and equipment inventory',()=>{
 const initial=newExplorationModel(()=>0);initial.state.market.floor=50
 seed(applyExplorationAction(initial,{type:'door',index:0},0,()=>0))
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 expect(screen.getByRole('progressbar',{name:'황금왕 라세프 체력'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'공격',exact:true})).toBeTruthy()
 expect(screen.queryByRole('button',{name:/도망/})).toBeNull()
 capture('boss')
 fireEvent.click(screen.getByRole('button',{name:'주무기 교체'}))
 expect(screen.getByRole('dialog')).toBeTruthy()
 capture('inventory')
})
function capture(name:string){
 if(!process.env.VERIFIED_EXPLORATION_QA)return
 const root=encodeURI(process.cwd().replaceAll('\\','/')),buildDir=process.env.EXPLORATION_BUILD_DIR??'dist',assetDir=buildDir+'/assets'
 const styles=(existsSync(assetDir)?readdirSync(assetDir):[]).filter(file=>/^(index|exploration-page)-.*\.css$/.test(file)).map(file=>`<link rel="stylesheet" href="file:///${root}/${assetDir}/${file}">`).join('')
 const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/http:\/\/localhost:\d+\/src\//g,`file:///${root}/src/`).replace(/([="(;])\/src\//g,`$1file:///${root}/src/`).replace(/([="(;])\/(exploration|branding|currency|arcade|app-icons)\//g,`$1file:///${root}/public/$2/`)
 writeFileSync(`artifacts/verified-exploration-${name}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<style>*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`)
}
it('renders compact split buff and ailment strips in the full game',()=>{
 const model=newExplorationModel(()=>0)
 model.state=startMonsterCombat(model.state,'sand-scorpion')
 model.view='combat'
 model.state.combat!.turn=1
 model.state.combat!.pattern={shieldHp:40,shieldTurns:3}
 model.state.combat!.shield={remaining:18,turns:2}
 model.state.combat!.spellEffects=[{id:'lapis-veil',turns:3},{id:'sandstone-skin',turns:2},{id:'solar-brand',turns:3}]
 model.state.playerEffects=[{kind:'bleed',amount:2,turns:2}]
 seed(model)
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 expect(screen.getByRole('region',{name:'버프'})).toBeTruthy()
 capture('buffs')
})
it('shows the shield guard with its capacity badge and body shield effect',()=>{
 const model=newExplorationModel(()=>0)
 model.state=startMonsterCombat(model.state,'sandstone-shield-guard');model.view='combat'
 model.state.combat!.turn=1;model.state.combat!.pattern={shieldHp:30}
 seed(model)
 render(<VerifiedExplorationGame runId={id} nickname="퐁이" onLeave={()=>{}}/>)
 expect(screen.getByRole('img',{name:'사암 방패병'}).getAttribute('src')).toContain('sandstone-shield-guard.png')
 expect(screen.getByRole('button',{name:'보호막 30'})).toBeTruthy()
 expect(document.querySelector('.combat-enemy-shield')).toBeTruthy()
 capture('shield-guard')
})
it('discards a late successful result when the account changes',async()=>{
 const original=seed();let resolve!:(v:any)=>void;invoke.mockReturnValueOnce(new Promise(r=>resolve=r))
 const task=commandExploration({runId:id,operationId:crypto.randomUUID(),revision:0,action:{type:'door',index:0}})
 setQueryAccount('two');resolve({data:{...original,revision:1},error:null})
 await expect(task).rejects.toThrow('ACCOUNT_CHANGED')
 await waitFor(()=>expect(appQueryClient.getQueryData(accountQueryKey('two',['exploration-run',id]))).toBeUndefined())
})
it('does not replace a newer server revision with an older retry receipt',async()=>{
 const original=seed(),newer={...original,revision:5}
 appQueryClient.setQueryData(accountQueryKey('one',['exploration-run',id]),newer)
 invoke.mockResolvedValueOnce({data:{...original,revision:2},error:null})
 expect(await commandExploration({runId:id,operationId:crypto.randomUUID(),revision:1,action:{type:'read'}})).toEqual(newer)
 expect(appQueryClient.getQueryData(accountQueryKey('one',['exploration-run',id]))).toEqual(newer)
})
it('can exit a run that was superseded by another tab without sending another write',()=>{
 const original=seed(),leave=vi.fn()
 appQueryClient.setQueryData(accountQueryKey('one',['exploration-run',id]),{...original,abandoned:true})
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={leave}/>)
 fireEvent.click(screen.getByRole('button',{name:'메인 화면으로'}))
 expect(leave).toHaveBeenCalledOnce()
 expect(invoke).not.toHaveBeenCalled()
})
it.each([false,true])('keeps rapid clicks to one turn and presents attack, bleeding and counter separately (bleeding=%s)',async(bleeding)=>{
 vi.useFakeTimers()
 const model=newExplorationModel(()=>0)
 model.view='combat';model.state=startMonsterCombat({...model.state,weapons:[{...model.state.weapons[0],attack:14,attackVariance:4,critical:100}],...(bleeding?{playerEffects:[{kind:'bleed' as const,amount:2,turns:3}]}:{})},'sand-scorpion')
 model.state.combat!.enemyHp=100
 const rolls=[0,0] // Critical, lowest weapon roll, then a landed ordinary counter.
 const original=seed(model),next={...original,revision:1,model:applyExplorationAction(model,{type:'combat',action:{type:'attack'}},0,()=>rolls.shift()??.99)}
 const hit=next.model.result!.events.find(e=>e.kind==='player')!,reply=next.model.result!.events.find(e=>e.kind==='monster'||e.kind==='defense')!
 expect(hit).toMatchObject({damage:19,critical:true}) // (10 × 2) − 1 armor.
 let finish!:(v:any)=>void;invoke.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}))
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 await act(async()=>vi.advanceTimersByTimeAsync(1000))
 const attack=screen.getByRole('button',{name:'공격',exact:true})
 for(let i=0;i<20;i++)fireEvent.click(attack)
 expect(invoke).toHaveBeenCalledTimes(1)
 if(!bleeding)capture('combat-busy')
 await act(async()=>finish({data:next,error:null}))
 const log=()=>screen.getByLabelText('탐험 로그').textContent!
 expect(log()).not.toContain('19 피해')
 expect((screen.getByRole('button',{name:'주무기 교체'}) as HTMLButtonElement).disabled).toBe(true)
 await act(async()=>vi.advanceTimersByTimeAsync(combatTimings.player))
 expect(log()).toContain('치명타');expect(log()).toContain('19 피해')
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'}).getAttribute('value')).toBe('100')
 if(bleeding){
  await act(async()=>vi.advanceTimersByTimeAsync(combatTimings.bleed-combatTimings.player))
  expect(log()).toContain('출혈로');expect(log()).toContain('2 피해')
  expect(screen.getByRole('progressbar',{name:'탐험가 체력'}).getAttribute('value')).toBe('98')
 }
 const pause=bleeding?combatTimings.statusPause:0
 await act(async()=>vi.advanceTimersByTimeAsync(combatTimings.reply+pause-(bleeding?combatTimings.bleed:combatTimings.player)))
 expect(log()).toContain(`${reply.damage} 피해`);expect(log()).toContain('입었습니다')
 for(let i=0;i<20;i++)fireEvent.click(attack)
 expect(invoke).toHaveBeenCalledTimes(1)
 await act(async()=>vi.advanceTimersByTimeAsync(combatTimings.done-combatTimings.reply))
 invoke.mockResolvedValueOnce({data:{...next,revision:2,model:applyExplorationAction(next.model,{type:'combat',action:{type:'attack'}},1,()=>.99)},error:null})
 fireEvent.click(attack);await act(async()=>{})
 expect(invoke).toHaveBeenCalledTimes(2)
 expect(invoke.mock.calls[1][1].body.revision).toBe(1)
 expect(invoke.mock.calls[1][1].body.operationId).not.toBe(invoke.mock.calls[0][1].body.operationId)
})

it('shows stairs on initial entry and a deeper floor, but not for same-floor updates',async()=>{
 vi.useFakeTimers()
 const original=seed()
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 expect(screen.getByLabelText('지하 1층으로 내려가는 중')).toBeTruthy()
 expect(screen.queryByLabelText('지하 1층 도착')).toBeNull()
 expect(document.querySelector('.exploration-descent-sprite')).toBeTruthy()
 capture('stairs')
 await act(async()=>vi.advanceTimersByTimeAsync(1200))
 expect(screen.getByRole('group',{name:'지하 1층의 세 문'})).toBeTruthy()
 expect(screen.getByLabelText('지하 1층 도착').textContent).toBe('지하 1층')
 const next={...original,revision:1,model:{...original.model,state:{...original.model.state,market:{...original.model.state.market,floor:2}}}}
 await act(async()=>appQueryClient.setQueryData(accountQueryKey('one',['exploration-run',id]),next))
 await act(async()=>vi.advanceTimersByTimeAsync(1))
 expect(screen.getByLabelText('지하 2층으로 내려가는 중')).toBeTruthy()
 expect(screen.queryByLabelText('지하 1층 도착')).toBeNull()
 await act(async()=>vi.advanceTimersByTimeAsync(1200))
 expect(screen.getByLabelText('지하 2층 도착')).toBeTruthy()
 await act(async()=>vi.advanceTimersByTimeAsync(2400))
 expect(screen.queryByLabelText('지하 2층 도착')).toBeNull()
 await act(async()=>appQueryClient.setQueryData(accountQueryKey('one',['exploration-run',id]),{...next,revision:2}))
 await act(async()=>vi.advanceTimersByTimeAsync(1))
 expect(screen.queryByLabelText('지하 2층으로 내려가는 중')).toBeNull()
 expect(screen.queryByLabelText('지하 2층 도착')).toBeNull()
 expect(invoke).not.toHaveBeenCalled()
})

it('shows a player prelude before revealing the monster and its arrival dialogue',async()=>{
 vi.useFakeTimers()
 const model=newExplorationModel(()=>0);model.view='combat';model.state=startMonsterCombat(model.state,'sand-scorpion')
 seed(model)
 render(<VerifiedExplorationGame runId={id} nickname="탐험퐁이" onLeave={()=>{}}/>)
 expect(document.querySelector('.exploration-combat')?.classList.contains('is-encounter-prelude')).toBe(true)
 expect(screen.getByLabelText('탐험 로그').textContent).toMatch(/소리|어둠|발소리|공기|저 앞/)
 await act(async()=>vi.advanceTimersByTimeAsync(999))
 expect(document.querySelector('.is-encounter-prelude')).toBeTruthy()
 await act(async()=>vi.advanceTimersByTimeAsync(1))
 expect(document.querySelector('.is-encounter-prelude')).toBeNull()
 expect(monsterArrivalLines('sand-scorpion').some(line=>screen.getByLabelText('탐험 로그').textContent?.includes(line))).toBe(true)
 expect(document.querySelector('.exploration-dialogue strong')?.textContent).toBe('탐험퐁이:')
 expect(screen.queryByText('문을 선택하고 탐험을 계속하세요.')).toBeNull()
 capture('encounter')
})

it('shows the thief approach before its choices and sends a recovery fight through the same server boundary',async()=>{
 vi.useFakeTimers()
 const model=newExplorationModel(()=>.99)
 model.state={...model.state,potions:{health:2,mana:1},market:{...model.state.market,doors:['thief']}}
 const visited=applyExplorationAction(model,{type:'door',index:0},0,()=>.99),original=seed(visited)
 render(<VerifiedExplorationGame runId={id} nickname="탐험퐁이" onLeave={()=>{}}/>)
 expect(screen.queryByRole('img',{name:'포션 도둑'})).toBeNull()
 expect(screen.getByLabelText('탐험 로그').textContent).toContain('누군가 천천히 다가온다...')
 await act(async()=>vi.advanceTimersByTimeAsync(1000))
 expect(screen.getByRole('img',{name:'포션 도둑'})).toBeTruthy()
 await act(async()=>vi.advanceTimersByTimeAsync(1200))
 capture('potion-thief')
 invoke.mockResolvedValueOnce({data:{...original,revision:1,model:applyExplorationAction(visited,{type:'thief-fight'},0,()=>.99)},error:null})
 fireEvent.click(screen.getByRole('button',{name:'싸워서 뺏는다'}));await act(async()=>vi.advanceTimersByTimeAsync(1))
 expect(invoke.mock.calls[0][1].body.action).toEqual({type:'thief-fight'})
 expect(screen.getByRole('region',{name:'포션 도둑 전투'})).toBeTruthy()
 expect(document.querySelector('.exploration-combat')?.getAttribute('style')).toContain(getAdventureRoom('thief')!.background)
 capture('thief-combat')
})

it.each(['chest','investigate-wall'] as const)('keeps the %s room backdrop when a monster appears and the combat is reloaded',(roomId)=>{
 const model=newExplorationModel(()=>0);model.state.market.doors=[roomId];model.state=startMonsterCombat({...model.state,door:0},'sand-scorpion');model.view='combat'
 seed(model)
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 const background=getAdventureRoom(roomId)!.background
 expect(document.querySelector<HTMLElement>('.exploration-scene')!.style.backgroundImage).toContain(background)
 expect(document.querySelector<HTMLElement>('.exploration-combat')!.style.getPropertyValue('--combat-backdrop')).toContain(background)
 if(roomId==='chest')capture('chest-combat')
})

it('opens the spell shop from a conversation and keeps spell art in bounded rows',async()=>{
 const model=newExplorationModel(()=>0);model.view='shaman';model.state={...model.state,gold:10000,shamanStock:{floor:1,shopkeeperId:'nadim',spellIds:['tide']}}
 const original=seed(model)
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 expect(screen.queryByRole('button',{name:'배우기',exact:true})).toBeNull()
 capture('shaman')
 fireEvent.click(screen.getByRole('button',{name:'마법을 살펴본다'}))
 expect(screen.getByRole('dialog')).toBeTruthy()
 expect(document.querySelector('.exploration-shop-items img')?.className).toBe('exploration-shop-weapon')
 capture('shaman-shop')
 const next={...original,revision:1,model:applyExplorationAction(model,{type:'learn',id:'tide'},0,()=>0)}
 invoke.mockResolvedValueOnce({data:next,error:null})
 fireEvent.click(screen.getByRole('button',{name:'배우기',exact:true}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(invoke.mock.calls[0][1].body.action).toEqual({type:'learn',id:'tide'})
})

it('opens equipment wares in three-column rows instead of squeezing descriptions into the artwork column',()=>{
 const model=newExplorationModel(()=>0);model.view='merchant';model.state={...model.state,gold:10000,market:{...model.state.market,weaponIds:['merchant-dagger']}}
 seed(model)
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 capture('merchant')
 fireEvent.click(screen.getByRole('button',{name:'구매한다',exact:true}))
 expect(screen.getByRole('dialog')).toBeTruthy()
 const rows=document.querySelectorAll('.exploration-shop-items article')
 expect(rows.length).toBeGreaterThan(0)
 rows.forEach(row=>expect(row.children).toHaveLength(3))
 capture('merchant-shop')
})
