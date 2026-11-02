import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {appQueryClient,accountQueryKey,setQueryAccount} from '@/lib/account-cache'
import {VerifiedExplorationGame} from '@/features/exploration/verified-exploration-game'
import {applyExplorationAction,newExplorationModel} from '@/features/exploration/server-engine'
import {commandExploration,type ExplorationReceipt} from '@/features/exploration/reward-api'
import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {startMonsterCombat} from '@/features/exploration/combat-state'
import {combatTimings} from '@/features/exploration/combat-timing'
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
 await screen.findByRole('button',{name:'쉬었다 간다'})
 capture('rest')
 expect(invoke.mock.calls[1][1].body).toEqual(first)
})
it('publishes the server-confirmed completion and invalidates the wallet only after payment',async()=>{
 const original=seed(),key=accountQueryKey('one','wallet')
 appQueryClient.setQueryData(key,{gold:100})
 let resolve!:(v:any)=>void;invoke.mockReturnValueOnce(new Promise(r=>resolve=r))
 const completed={...original,revision:1,rewardGold:2000,finishedAt:new Date().toISOString(),model:{...original.model,state:{...original.model.state,completed:true}}}
 const task=commandExploration({runId:id,operationId:crypto.randomUUID(),revision:0,action:{type:'descend'}})
 expect(appQueryClient.getQueryState(key)?.isInvalidated).toBe(false)
 expect(appQueryClient.getQueryData(key)).toEqual({gold:100})
 await act(async()=>{resolve({data:completed,error:null});await task})
 expect(appQueryClient.getQueryState(key)?.isInvalidated).toBe(true)
 render(<VerifiedExplorationGame runId={id} nickname="탐험가" onLeave={()=>{}}/>)
 expect(screen.getByRole('status').textContent).toBe('2,000골드 지급 완료')
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
 const root=process.cwd().replaceAll('\\','/'),styles=readdirSync('dist/assets').filter(file=>/^(index|exploration-page)-.*\.css$/.test(file)).map(file=>`<link rel="stylesheet" href="file:///${root}/dist/assets/${file}">`).join('')
 const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/([="(;])\/src\//g,`$1file:///${root}/src/`).replace(/([="(;])\/(exploration|branding|currency|arcade|app-icons)\//g,`$1file:///${root}/public/$2/`)
 writeFileSync(`artifacts/verified-exploration-${name}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<style>*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`)
}
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
 const attack=screen.getByRole('button',{name:'공격',exact:true})
 for(let i=0;i<20;i++)fireEvent.click(attack)
 expect(invoke).toHaveBeenCalledTimes(1)
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
