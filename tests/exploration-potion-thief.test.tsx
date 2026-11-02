import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PotionThiefRoom} from '@/features/exploration/potion-thief-room'
import {newExplorationModel,applyExplorationAction} from '@/features/exploration/server-engine'
import {resolveCombatTurn} from '@/features/exploration/combat-state'
import {encounterRoomBackdrop} from '@/features/exploration/encounter-background'
import {createRoomVisit,getAdventureRoom} from '@/features/exploration/adventure-rooms'
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()})
const roll=()=>.99
function enter(potions={health:2,mana:1}){
 const model=newExplorationModel(roll)
 model.state={...model.state,potions,market:{...model.state.market,doors:['thief']}}
 return applyExplorationAction(model,{type:'door',index:0},0,roll)
}
it('always steals two available potions, capped by ownership for either potion type',()=>{
 for(const potions of [{health:10,mana:10},{health:3,mana:0},{health:0,mana:3},{health:1,mana:1},{health:1,mana:0},{health:0,mana:1},{health:0,mana:0}]){
  for(const value of [0,.25,.75,.99]){
   const model=newExplorationModel(()=>value)
   const visit=createRoomVisit('thief',{...model.state,potions},'theft-test',()=>value)
   expect(visit.stolen.health+visit.stolen.mana).toBe(Math.min(2,potions.health+potions.mana))
   expect(visit.stolen.health).toBeLessThanOrEqual(potions.health)
   expect(visit.stolen.mana).toBeLessThanOrEqual(potions.mana)
  }
 }
})
it('finishes the silent approach before revealing the thief and both choices',async()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 const fight=vi.fn(),leave=vi.fn()
 render(<PotionThiefRoom stolen={{health:1,mana:1}} busy={false} onFight={fight} onLeave={leave}/>)
 expect(screen.getByLabelText('탐험 로그').textContent).toContain('탐험: 누군가 천천히 다가온다...')
 expect(screen.queryByRole('img',{name:'포션 도둑'})).toBeNull()
 expect(screen.queryByRole('button')).toBeNull()
 await act(async()=>vi.advanceTimersByTimeAsync(999))
 expect(screen.queryByRole('img')).toBeNull()
 await act(async()=>vi.advanceTimersByTimeAsync(1))
 expect(screen.getByRole('img',{name:'포션 도둑'})).toBeTruthy()
 expect(screen.getByLabelText('탐험 로그').textContent).toContain('체력 포션 1개 · 마나 포션 1개')
 expect(screen.queryByRole('button')).toBeNull()
 await act(async()=>vi.advanceTimersByTimeAsync(1199))
 expect(screen.queryByRole('button')).toBeNull()
 await act(async()=>vi.advanceTimersByTimeAsync(1))
 fireEvent.click(screen.getByRole('button',{name:'싸워서 뺏는다'}));expect(fight).toHaveBeenCalledOnce()
 fireEvent.click(screen.getByRole('button',{name:'보내준다'}));expect(leave).toHaveBeenCalledOnce()
})
it('keeps the approach visible through typing and waits for the theft narration before choices',async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','performance']})
 vi.stubGlobal('matchMedia',()=>({matches:false}))
 render(<PotionThiefRoom stolen={{health:1,mana:0}} busy={false} onFight={()=>{}} onLeave={()=>{}}/>)
 const typedDuration=(text:string)=>Math.ceil(Math.min(1100,Math.max(280,Array.from(text).length*22))/16)*16
 await act(async()=>vi.advanceTimersByTimeAsync(typedDuration('누군가 천천히 다가온다...')+999))
 expect(screen.queryByRole('img')).toBeNull()
 expect(screen.queryByRole('button')).toBeNull()
 await act(async()=>vi.advanceTimersByTimeAsync(1))
 expect(screen.getByRole('img',{name:'포션 도둑'})).toBeTruthy()
 const narration=screen.getByLabelText('탐험 로그').querySelector('.sr-only')!.textContent!
 await act(async()=>vi.advanceTimersByTimeAsync(typedDuration(narration)+1199))
 expect(screen.queryByRole('button')).toBeNull()
 await act(async()=>vi.advanceTimersByTimeAsync(1))
 expect(screen.getByRole('button',{name:'싸워서 뺏는다'})).toBeTruthy()
})
it('keeps legacy runs from offering recovery combat that their original engine does not support',async()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 render(<PotionThiefRoom stolen={{health:2,mana:0}} canFight={false} busy={false} onFight={()=>{}} onLeave={()=>{}}/>)
 await act(async()=>vi.advanceTimersByTimeAsync(1000))
 await act(async()=>vi.advanceTimersByTimeAsync(1200))
 expect(screen.queryByRole('button',{name:'싸워서 뺏는다'})).toBeNull()
 expect(screen.getByRole('button',{name:'보내준다'})).toBeTruthy()
})
it('does not offer a recovery fight when no potions were stolen',async()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 render(<PotionThiefRoom stolen={{health:0,mana:0}} busy={false} onFight={()=>{}} onLeave={()=>{}}/>)
 await act(async()=>vi.advanceTimersByTimeAsync(1000))
 await act(async()=>vi.advanceTimersByTimeAsync(1200))
 expect(screen.queryByRole('button',{name:'싸워서 뺏는다'})).toBeNull()
 expect(screen.getByRole('button',{name:'보내준다'})).toBeTruthy()
 expect(()=>applyExplorationAction(enter({health:0,mana:0}),{type:'thief-fight'},0,roll)).toThrow('INVALID_EXPLORATION_ACTION')
})
it('returns only this encounter’s stolen potions once on victory, preserving the room backdrop',()=>{
 const visit=enter(),stolen=visit.visit!.stolen
 expect(stolen.health+stolen.mana).toBe(2)
 const started=applyExplorationAction(visit,{type:'thief-fight'},0,roll)
 expect(started.state.combat).toMatchObject({monsterId:'potion-thief',stolenPotions:stolen})
 expect(encounterRoomBackdrop(started.state)).toBe(getAdventureRoom('thief')!.background)
 const initialGold=started.state.gold
 const damaged={...started,state:{...started.state,combat:{...started.state.combat!,enemyHp:1}}}
 const won=applyExplorationAction(damaged,{type:'combat',action:{type:'attack'}},0,roll)
 expect(won.state.potions).toEqual({health:2,mana:1})
 expect(won.state.gold).toBe(initialGold)
 expect(won.pendingLoot).toBeNull()
 expect(started.state.potions).toEqual(visit.state.potions)
 expect(()=>applyExplorationAction(won,{type:'combat',action:{type:'attack'}},0,roll)).toThrow()
 expect(visit.visit?.stolen).toEqual(stolen)
})
it('does not refund potions when leaving, dying or escaping',()=>{
 const visited=enter(),after=applyExplorationAction(visited,{type:'descend'},0,roll)
 expect(after.state.market.floor).toBe(2);expect(after.state.potions).toEqual(visited.state.potions)
 const fight=applyExplorationAction(visited,{type:'thief-fight'},0,roll)
 const escaped=resolveCombatTurn(fight.state,{type:'flee'},()=>0)
 expect(escaped.state.combat?.status).toBe('escaped');expect(escaped.state.potions).toEqual(visited.state.potions)
 const lost=resolveCombatTurn({...fight.state,hp:1},{type:'attack'},roll)
 expect(lost.state.combat?.status).toBe('lost');expect(lost.state.potions).toEqual(visited.state.potions)
})
