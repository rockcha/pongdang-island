import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialAccountFarm,applyFarmCommand} from '@/features/farm/account-engine'
import type {FarmAccountSnapshot} from '@/features/farm/account-api'
import type {FarmCommand} from '@/features/farm/account-engine'
afterEach(()=>{cleanup();vi.restoreAllMocks()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
function setup(){
 const state=initialAccountFarm(),snapshot:FarmAccountSnapshot={state,wallet:{gold:0,inventory:{},testClaimed:false,testEnabled:false},revision:0,serverNow:new Date().toISOString(),sampledAt:Date.now(),undo:null,receipt:null}
 const execute=vi.fn(async(command:FarmCommand)=>({...snapshot,state:applyFarmCommand(state,command,Date.now()),revision:1}))
 const view=(busy:boolean)=><MemoryRouter><TopviewFarm account={{snapshot,busy,now:Date.now,execute}}/></MemoryRouter>
 const result=render(view(true))
 click('이동하기');click('종자 상점 (9,8)')
 fireEvent.click(result.container.querySelector('[data-farm-cell="12,7"]')!)
 return {...result,execute,view}
}
it('waits for an in-flight save and submits the chosen move exactly once',async()=>{
 const s=setup()
 expect(s.execute).not.toHaveBeenCalled()
 expect(s.container.querySelector('[data-move-preview]')).toBeTruthy()
 await act(async()=>{s.rerender(s.view(false))})
 expect(s.execute).toHaveBeenCalledExactlyOnceWith({type:'move',id:23,x:12,y:7,transform:{rotation:undefined,flipped:undefined}})
 expect(s.container.querySelector('[data-move-preview]')).toBeNull()
})
it('discards a deferred drop when the user cancels placement',async()=>{
 const s=setup()
 fireEvent.keyDown(s.container.querySelector('.top-farm')!,{key:'Escape'})
 await act(async()=>{s.rerender(s.view(false))})
 expect(s.execute).not.toHaveBeenCalled()
 expect(s.container.querySelector('[data-move-preview]')).toBeNull()
})
