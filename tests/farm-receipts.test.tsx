import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview,type TopviewState} from '@/features/farm/topview-model'
import {simulateFarm} from '@/features/farm/farm-simulation'
import type {FarmAccountSnapshot} from '@/features/farm/account-api'

function readyFarm(state:TopviewState){
 state.objects.push({id:100,kind:'mill',x:6,y:12},{id:101,kind:'textileMill',x:6,y:13},{id:102,kind:'sewingWorkshop',x:8,y:14},{id:103,kind:'butcher',x:14,y:12},{id:104,kind:'cow',x:16,y:10},{id:105,kind:'coop',x:16,y:12})
 state.simulation.millJobs[100]={product:'flour',quantity:2,startedAt:0,readyAt:1}
 state.simulation.processingJobs={28:{recipe:'wholeWheatPorridge',quantity:2,startedAt:0,readyAt:1},101:{recipe:'woolYarn',quantity:2,startedAt:0,readyAt:1},102:{recipe:'towel',quantity:2,startedAt:0,readyAt:1}}
 state.simulation.butcherJobs={103:{good:'chickenMeat',quantity:6,startedAt:0,readyAt:1}}
 state.simulation.animalJobs[104]=1
 state.simulation.animalPurchaseJobs[105]={animal:'chicken',startedAt:0,readyAt:1}
 return state
}
vi.mock('@/features/farm/trial-inventory',async importOriginal=>{
 const original=await importOriginal<typeof import('@/features/farm/trial-inventory')>()
 return {...original,initialFarmTrial:()=>readyFarm(original.initialFarmTrial())}
})
afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
const start=()=>{vi.useFakeTimers();vi.setSystemTime(1000);return render(<MemoryRouter><TopviewFarm/></MemoryRouter>)}
it.each([
 ['제분 진행','flour',2],['통밀죽 제작 진행','wholeWheatPorridge',2],['털실 제작 진행','woolYarn',2],['수건 제작 진행','towel',2],['고기 가공 진행','chickenMeat',6],
] as const)('receives %s with one local image and quantity instead of a popup',(label,good,quantity)=>{
 const {container}=start();click(label)
 const receipt=container.querySelector(`[data-harvest-receipt="${good}"]`)!
 expect(receipt).toBeTruthy();expect(receipt.getAttribute('data-receipt-action')).toBe('received')
 expect(receipt.textContent).toContain('+'+quantity);expect(receipt.querySelector('image')).toBeTruthy()
 expect(receipt.getAttribute('pointer-events')).toBe('none')
 expect(screen.queryByRole('dialog')).toBeNull();expect(document.querySelector('.farm-action-card')).toBeNull()
 expect(screen.queryByRole('button',{name:label,exact:true})).toBeNull()
 act(()=>vi.advanceTimersByTime(1201));expect(container.querySelector('[data-harvest-receipt]')).toBeNull()
})
it('uses the same small receipt for animal products and the animal itself',()=>{
 start();click('우유 생산 (16,10)')
 expect(screen.getByRole('img',{name:'우유 2개 수확 · 창고에 보관'})).toBeTruthy()
 click('닭 보관함으로 받기')
 const receipt=screen.getByRole('img',{name:'닭 1마리 수령 · 보관함에 보관'})
 expect(receipt.querySelector('svg')).toBeTruthy();expect(receipt.querySelector('image')).toBeTruthy()
 expect(document.querySelector('.farm-action-card')).toBeNull()
})
it('shows a receipt only after the account server confirms collection',async()=>{
 vi.useFakeTimers();vi.setSystemTime(1000)
 const state=readyFarm(initialTopview()),snapshot:FarmAccountSnapshot={state,revision:0,serverNow:new Date().toISOString(),sampledAt:Date.now(),wallet:{gold:state.gold,inventory:{},testEnabled:false,testClaimed:false},undo:null,receipt:null}
 let resolve!:(value:FarmAccountSnapshot)=>void
 const execute=vi.fn(()=>new Promise<FarmAccountSnapshot>(r=>{resolve=r}))
 const view=(s:FarmAccountSnapshot)=><MemoryRouter><TopviewFarm account={{snapshot:s,busy:false,now:Date.now,execute}}/></MemoryRouter>
 const {container,rerender}=render(view(snapshot));await act(async()=>click('제분 진행'))
 expect(container.querySelector('[data-harvest-receipt]')).toBeNull()
 const confirmed={...snapshot,state:simulateFarm(state,100,{type:'collectFlour'},1000).state,revision:1}
 await act(async()=>{resolve(confirmed);rerender(view(confirmed))})
 expect(container.querySelector('[data-harvest-receipt="flour"]')?.textContent).toContain('+2')
 expect(execute).toHaveBeenCalledTimes(1)
})
it('preserves ready products and shows no receipt after a rejected collection',async()=>{
 vi.useFakeTimers();vi.setSystemTime(1000)
 const state=readyFarm(initialTopview()),execute=vi.fn().mockResolvedValue(null)
 const {container}=render(<MemoryRouter><TopviewFarm account={{snapshot:{state,revision:0,serverNow:new Date().toISOString(),sampledAt:Date.now(),wallet:{gold:state.gold,inventory:{},testEnabled:false,testClaimed:false},undo:null,receipt:null},busy:false,now:Date.now,execute}}/></MemoryRouter>)
 await act(async()=>click('제분 진행'))
 expect(container.querySelector('[data-harvest-receipt]')).toBeNull();expect(screen.getByRole('button',{name:'제분 진행'})).toBeTruthy()
 expect(state.simulation.inventory.flour).toBe(0)
})
