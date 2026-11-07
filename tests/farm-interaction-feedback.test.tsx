import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialAccountFarm,applyFarmCommand,type FarmCommand} from '@/features/farm/account-engine'
import type {FarmAccountSnapshot} from '@/features/farm/account-api'
import {farmMapWidth,farmMapHeight,farmCellCenter} from './helpers/farm-map'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
function snapshot():FarmAccountSnapshot{
 const state=initialAccountFarm();state.simulation.cropJobs[10]={crop:'wheat',readyAt:0}
 return {state,wallet:{gold:0,inventory:{},testClaimed:false,testEnabled:false},revision:0,serverNow:new Date(1000).toISOString(),sampledAt:1000,undo:null,receipt:null}
}
function setup(execute:(command:FarmCommand)=>Promise<FarmAccountSnapshot|null>,busy=false){
 vi.useFakeTimers();vi.setSystemTime(1000)
 const data=snapshot(),view=(saving=busy,saved=data)=><MemoryRouter><TopviewFarm account={{snapshot:saved,busy:saving,now:Date.now,execute}}/></MemoryRouter>
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
 expect(screen.getByRole('img',{name:/창고 12 \/ 40/})).toBeTruthy()
 expect(s.container.querySelector('[data-harvest-receipt]')).toBeNull()
 s.harvest();expect(execute).toHaveBeenCalledTimes(1)
 const saved={...s.data,state:applyFarmCommand(s.data.state,execute.mock.calls[0][0],1000),revision:1}
 await act(async()=>{vi.advanceTimersByTime(300);resolve(saved);s.rerender(s.view(false,saved))})
 expect(s.container.querySelector('[data-harvest-starting]')).toBeNull()
 expect(s.container.querySelector('[data-harvesting="10"]')).toBeTruthy()
 expect(screen.getByRole('img',{name:/창고 15 \/ 40/})).toBeTruthy()
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
it('waits for a busy save, sends one harvest request, and clears the pending effect on rejection',async()=>{
 const execute=vi.fn().mockResolvedValue(null),s=setup(execute,true)
 s.harvest();s.harvest()
 expect(execute).not.toHaveBeenCalled()
 expect(s.container.querySelectorAll('[data-harvest-starting]')).toHaveLength(1)
 await act(async()=>{s.rerender(s.view(false))})
 expect(execute).toHaveBeenCalledTimes(1)
 expect(s.container.querySelector('[data-harvest-starting]')).toBeNull()
 expect(s.container.querySelector('[data-harvesting]')).toBeNull()
 expect(screen.getByRole('img',{name:/창고 12 \/ 40/})).toBeTruthy()
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
