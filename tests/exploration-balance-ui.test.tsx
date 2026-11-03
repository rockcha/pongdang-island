import {useState} from 'react'
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ExplorationPlay} from '@/features/exploration/verified-exploration-game'
import {newExplorationModel,applyExplorationAction} from '@/features/exploration/server-engine'
import {createRoomVisit,type AdventureRoomId} from '@/features/exploration/adventure-rooms'
import {getFloorMonster} from '@/features/exploration/monster-catalog'
import {ExplorationCodex} from '@/features/exploration/codex'
import type {ExplorationReceipt,ExplorationRequest} from '@/features/exploration/reward-api'
const sound=vi.hoisted(()=>vi.fn())
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play:sound,dispose(){},startDescent(){},stopDescent(){}})}))
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();sound.mockReset()})
function roomReceipt(id:AdventureRoomId,floor:number):ExplorationReceipt{
 const model=newExplorationModel(()=>.2)
 model.state={...model.state,balanceVersion:2,market:{...model.state.market,floor}}
 model.view='room';model.visit=createRoomVisit(id,model.state,'test',()=>.2)
 return {id:'test',revision:0,model,rewardGold:0,finishedAt:null,abandoned:false}
}
it.each([{id:'sleeping-giant',monster:'ancient-giant'},{id:'sealed-scarab',monster:'treasure-scarab'}] as const)('shows actual scaled health before awakening $id',({id,monster})=>{
 const receipt=roomReceipt(id,25)
 render(<ExplorationPlay runId="test" nickname="퐁이" onLeave={()=>{}} receipt={receipt} dispatch={vi.fn()} reload={()=>{}}/>)
 const expected=getFloorMonster(monster,25,true)
 expect(screen.getByRole('progressbar',{name:expected.name+' 체력'})).toHaveProperty('max',expected.maxHp)
 expect(screen.getByRole('progressbar',{name:expected.name+' 체력'})).toHaveProperty('value',expected.maxHp)
 expect(screen.getByText(`${expected.maxHp} / ${expected.maxHp}`)).toBeTruthy()
})
it('shows both confirmed potions in one central receipt and never replays it on restoration',async()=>{
 const initial=roomReceipt('boss-supply-chest',19)
 let committed:ExplorationReceipt|undefined,release!:()=>void
 const gate=new Promise<void>(resolve=>release=resolve)
 function Harness(){
  const [receipt,setReceipt]=useState(initial)
  async function dispatch(request:ExplorationRequest){
   await gate
   const model=applyExplorationAction(receipt.model,request.action as Parameters<typeof applyExplorationAction>[1],1000,()=>.2)
   committed={...receipt,revision:receipt.revision+1,model};setReceipt(committed);return committed
  }
  return <ExplorationPlay runId="test" nickname="퐁이" onLeave={()=>{}} receipt={receipt} dispatch={dispatch} reload={()=>{}}/>
 }
 const mounted=render(<Harness/>)
 fireEvent.click(screen.getByRole('button',{name:'상자를 연다'}))
 expect(screen.queryByRole('status',{name:'아이템 획득'})).toBeNull()
 await act(async()=>{release();await gate})
 const receipt=screen.getByRole('status',{name:'아이템 획득'})
 expect(within(receipt).getByText('체력 포션 ×1')).toBeTruthy()
 expect(within(receipt).getByText('마나 포션 ×1')).toBeTruthy()
 expect(within(receipt).getByText('포션 주머니에 넣었어요')).toBeTruthy()
 expect(receipt.querySelectorAll('img')).toHaveLength(2)
 expect(committed!.model.state.potions).toEqual({health:1,mana:1})
 expect(sound).toHaveBeenCalledWith('loot')
 expect(screen.queryByRole('button',{name:'상자를 연다'})).toBeNull()
 expect(()=>applyExplorationAction(committed!.model,{type:'search'})).toThrow()
 mounted.unmount()
 render(<ExplorationPlay runId="test" nickname="퐁이" onLeave={()=>{}} receipt={committed} dispatch={vi.fn()} reload={()=>{}}/>)
 expect(screen.queryByRole('status',{name:'아이템 획득'})).toBeNull()
})
it('shows adept spells and updated mana only in the new-run codex',()=>{
 const current=roomReceipt('boss-supply-chest',19).model.state
 const mounted=render(<ExplorationCodex initialCategory="spell" state={current}/>)
 fireEvent.click(screen.getByRole('button',{name:'도감'}))
 fireEvent.click(screen.getByRole('button',{name:'중상급 5'}))
 expect(within(screen.getByRole('tabpanel')).getAllByRole('heading')).toHaveLength(5)
 expect(screen.getByRole('heading',{name:'사금의 창'})).toBeTruthy()
 mounted.unmount()
 render(<ExplorationCodex initialCategory="spell" state={{...current,balanceVersion:undefined}}/>)
 fireEvent.click(screen.getByRole('button',{name:'도감'}))
 expect(screen.queryByRole('button',{name:'중상급 5'})).toBeNull()
 const ra=screen.getByRole('heading',{name:'라의 심판'}).closest('article')!
 expect(within(ra).getByText('16')).toBeTruthy()
})
