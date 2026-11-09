import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialAccountFarm,applyFarmCommand,type FarmCommand} from '@/features/farm/account-engine'
import type {FarmAccountSnapshot} from '@/features/farm/account-api'
import {farmMapWidth,farmMapHeight,farmCellCenter} from './helpers/farm-map'
import {developedFarmFixture} from './helpers/developed-farm-fixture'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
function snapshot():FarmAccountSnapshot{
 const state=initialAccountFarm();state.simulation.cropJobs[10]={crop:'wheat',readyAt:0}
 return {state,wallet:{gold:0,inventory:{},testClaimed:false,testEnabled:false},revision:0,serverNow:new Date(1000).toISOString(),sampledAt:1000,undo:null,receipt:null}
}
function setup(execute:(command:FarmCommand)=>Promise<FarmAccountSnapshot|null>,busy=false,configure?:(data:FarmAccountSnapshot)=>void){
 vi.useFakeTimers();vi.setSystemTime(1000)
 const data=snapshot();configure?.(data)
 const view=(saving=busy,saved=data)=><MemoryRouter><TopviewFarm account={{snapshot:saved,busy:saving,now:Date.now,execute}}/></MemoryRouter>
 const result=render(view()),viewport=result.container.querySelector('.top-farm-viewport')!
 vi.spyOn(result.container.querySelector('.top-farm-map')!,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:farmMapWidth,bottom:farmMapHeight,width:farmMapWidth,height:farmMapHeight,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,target:Element,x:number,y:number)=>fireEvent(target,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:farmCellCenter(x),clientY:farmCellCenter(y),button:0}),{pointerId:1,pointerType:'touch'}))
 const harvest=()=>{pointer('pointerdown',viewport,10,11);pointer('pointerup',viewport,10,11)}
 return {...result,data,view,viewport,pointer,harvest}
}
it('responds immediately while awaiting confirmation, without crediting inventory or reserving storage early',async()=>{
 let resolve!:(value:FarmAccountSnapshot|null)=>void
 const execute=vi.fn((_command:FarmCommand)=>new Promise<FarmAccountSnapshot|null>(r=>{resolve=r})),s=setup(execute)
 s.harvest()
 expect(execute).toHaveBeenCalledTimes(1)
 expect(s.container.querySelector('[data-harvest-starting="10"]')).toBeTruthy()
 expect(s.container.querySelector('[data-harvesting]')).toBeNull()
 expect(screen.getByRole('img',{name:/창고 12 \/ 60/})).toBeTruthy()
 expect(s.container.querySelector('[data-harvest-receipt]')).toBeNull()
 s.harvest();expect(execute).toHaveBeenCalledTimes(1)
 const saved={...s.data,state:applyFarmCommand(s.data.state,execute.mock.calls[0][0],1000),revision:1}
 await act(async()=>{vi.advanceTimersByTime(300);resolve(saved);s.rerender(s.view(false,saved))})
 expect(s.container.querySelector('[data-harvest-starting]')).toBeNull()
 expect(s.container.querySelector('[data-harvesting="10"]')).toBeTruthy()
 expect(screen.getByRole('img',{name:/창고 15 \/ 60/})).toBeTruthy()
})
it('does not block a fresh building tap during the previous harvest click suppression window',async()=>{
 const execute=vi.fn().mockResolvedValue(null),s=setup(execute)
 await act(async()=>{s.harvest()})
 const shop=s.container.querySelector('[data-object-id="23"]')!
 s.pointer('pointerdown',shop,9,8);s.pointer('pointerup',shop,9,8)
 fireEvent.click(shop)
 expect(screen.getByRole('dialog')).toBeTruthy()
 expect(screen.getByRole('heading',{name:'종자 상점'})).toBeTruthy()
})
it('hands a harvest to the account queue during a busy save and clears pending feedback on rejection',async()=>{
 const execute=vi.fn().mockResolvedValue(null),s=setup(execute,true)
 s.harvest();s.harvest()
 expect(execute).toHaveBeenCalledTimes(1)
 expect(s.container.querySelectorAll('[data-harvest-starting]')).toHaveLength(1)
 await act(async()=>{s.rerender(s.view(false))})
 expect(execute).toHaveBeenCalledTimes(1)
 expect(s.container.querySelector('[data-harvest-starting]')).toBeNull()
 expect(s.container.querySelector('[data-harvesting]')).toBeNull()
 expect(screen.getByRole('img',{name:/창고 12 \/ 60/})).toBeTruthy()
})
it('serializes a queued harvest and move without losing either request',async()=>{
 const resolvers:Array<(value:FarmAccountSnapshot|null)=>void>=[]
 const execute=vi.fn((_command:FarmCommand)=>new Promise<FarmAccountSnapshot|null>(resolve=>resolvers.push(resolve))),s=setup(execute,true)
 s.harvest()
 fireEvent.click(screen.getByRole('button',{name:'이동하기',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'종자 상점 (9,8)',exact:true}))
 fireEvent.click(s.container.querySelector('[data-farm-cell="12,7"]')!)
 await act(async()=>{s.rerender(s.view(false))})
 expect(execute).toHaveBeenCalledTimes(1)
 expect(execute.mock.calls[0][0].type).toBe('batch')
 expect(s.container.querySelector('[data-move-preview]')).toBeTruthy()
 const first={...s.data,state:applyFarmCommand(s.data.state,execute.mock.calls[0][0],1000),revision:1}
 await act(async()=>{resolvers[0](first);s.rerender(s.view(false,first))})
 expect(execute).toHaveBeenCalledTimes(2)
 expect(execute.mock.calls[1][0]).toMatchObject({type:'move',id:23,x:12,y:7})
 const second={...first,state:applyFarmCommand(first.state,execute.mock.calls[1][0],1000),revision:2}
 await act(async()=>{resolvers[1](second);s.rerender(s.view(false,second))})
 expect(execute).toHaveBeenCalledTimes(2)
 expect(s.container.querySelector('[data-move-preview]')).toBeNull()
})
it('keeps a newer destination when an earlier move confirmation arrives',async()=>{
 const resolvers:Array<(value:FarmAccountSnapshot|null)=>void>=[]
 const execute=vi.fn((_command:FarmCommand)=>new Promise<FarmAccountSnapshot|null>(resolve=>resolvers.push(resolve))),s=setup(execute)
 fireEvent.click(screen.getByRole('button',{name:'이동하기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'종자 상점 (9,8)',exact:true}))
 fireEvent.click(s.container.querySelector('[data-farm-cell="12,7"]')!)
 expect(execute).toHaveBeenCalledTimes(1)
 fireEvent.click(s.container.querySelector('[data-farm-cell="9,6"]')!)
 expect(execute).toHaveBeenCalledTimes(1)
 const first={...s.data,state:applyFarmCommand(s.data.state,execute.mock.calls[0][0],1000),revision:1}
 await act(async()=>{resolvers[0](first);s.rerender(s.view(false,first))})
 expect(execute).toHaveBeenCalledTimes(2)
 expect(execute.mock.calls[1][0]).toMatchObject({type:'move',id:23,x:9,y:6})
 expect(s.container.querySelector('[data-move-preview]')).toBeTruthy()
 const second={...first,state:applyFarmCommand(first.state,execute.mock.calls[1][0],1000),revision:2}
 await act(async()=>{resolvers[1](second);s.rerender(s.view(false,second))})
 expect(screen.getByRole('button',{name:'종자 상점 (9,6)',exact:true})).toBeTruthy()
 expect(s.container.querySelector('[data-move-preview]')).toBeNull()
})
it('accepts planting on different plots while saving, marks each immediately and ignores repeated taps',async()=>{
 const resolve:Array<(value:FarmAccountSnapshot|null)=>void>=[]
 const execute=vi.fn((_command:FarmCommand)=>new Promise<FarmAccountSnapshot|null>(done=>resolve.push(done)))
 const s=setup(execute,true,data=>{data.state.simulation.cropJobs={}})
 for(const name of ['농사','씨앗 심기','밀 4개'])fireEvent.click(screen.getByRole('button',{name,exact:true}))
 for(const x of [10,11,10]){s.pointer('pointerdown',s.viewport,x,11);s.pointer('pointerup',s.viewport,x,11)}
 expect(execute).toHaveBeenCalledTimes(2)
 expect(s.container.querySelectorAll('[data-farm-pending]')).toHaveLength(2)
 expect(s.data.state.simulation.inventory.wheatSeed).toBe(4)
 expect(s.container.querySelector('[data-planting-effect]')).toBeNull()
 await act(async()=>{resolve.forEach(done=>done(null))})
 expect(s.container.querySelector('[data-farm-pending]')).toBeNull()
 expect(s.container.querySelector('[data-planting-effect]')).toBeNull()
})
it('closes a production dialog immediately and leaves a newly opened dialog intact when confirmation arrives',async()=>{
 let resolve!:(value:FarmAccountSnapshot|null)=>void
 const execute=vi.fn((_command:FarmCommand)=>new Promise<FarmAccountSnapshot|null>(done=>{resolve=done}))
 const s=setup(execute,false,data=>{data.state=developedFarmFixture()})
 fireEvent.click(screen.getByRole('button',{name:'제분소 (6,13)',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'밀 제분 시작',exact:true}))
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(s.container.querySelector('[data-farm-pending="21"]')).toBeTruthy()
 expect(s.data.state.simulation.millJobs[21]).toBeUndefined()
 fireEvent.click(screen.getByRole('button',{name:'종자 상점 (8,6)',exact:true}))
 expect(screen.getByRole('heading',{name:'종자 상점',exact:true})).toBeTruthy()
 const saved={...s.data,state:applyFarmCommand(s.data.state,execute.mock.calls[0][0],1000),revision:1}
 await act(async()=>{resolve(saved);s.rerender(s.view(false,saved))})
 expect(s.container.querySelector('[data-farm-pending]')).toBeNull()
 expect(screen.getByRole('heading',{name:'종자 상점',exact:true})).toBeTruthy()
 expect(saved.state.simulation.millJobs[21]).toBeTruthy()
})
it('accounts for seeds already pending without spending confirmed inventory early',async()=>{
 let resolve!:(value:FarmAccountSnapshot|null)=>void
 const execute=vi.fn((_command:FarmCommand)=>new Promise<FarmAccountSnapshot|null>(done=>{resolve=done}))
 const s=setup(execute,false,data=>{data.state.simulation.cropJobs={};data.state.simulation.inventory.wheatSeed=1})
 for(const name of ['농사','씨앗 심기','밀 1개'])fireEvent.click(screen.getByRole('button',{name,exact:true}))
 for(const x of [10,11]){s.pointer('pointerdown',s.viewport,x,11);s.pointer('pointerup',s.viewport,x,11)}
 expect(execute).toHaveBeenCalledTimes(1)
 expect(s.data.state.simulation.inventory.wheatSeed).toBe(1)
 await act(async()=>resolve(null))
})
it('reserves pending harvest space so a later tap cannot overfill a grouped request',async()=>{
 let resolve!:(value:FarmAccountSnapshot|null)=>void
 const execute=vi.fn((_command:FarmCommand)=>new Promise<FarmAccountSnapshot|null>(done=>{resolve=done}))
 const s=setup(execute,false,data=>{data.state.simulation.inventory.wheat=57;data.state.simulation.cropJobs[11]={crop:'wheat',readyAt:0}})
 for(const x of [10,11]){s.pointer('pointerdown',s.viewport,x,11);s.pointer('pointerup',s.viewport,x,11)}
 expect(execute).toHaveBeenCalledTimes(1)
 expect(s.container.querySelectorAll('[data-harvest-starting]')).toHaveLength(1)
 expect(screen.getByRole('img',{name:/창고 57 \/ 60/})).toBeTruthy()
 await act(async()=>resolve(null))
})
