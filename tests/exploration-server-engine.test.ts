// @vitest-environment node
import {expect,it} from 'vitest'
import {applyExplorationAction as step,newExplorationModel,type ExplorationModel} from '../src/features/exploration/server-engine'
it('accepts only offered doors and never accepts client state, rewards, bosses or floor jumps',()=>{
 const model=newExplorationModel(()=>0)
 expect(()=>step(model,{type:'door',index:9})).toThrow()
 for(const type of ['finish','progress','start','encounter','reward','setState'])expect(()=>step(model,{type,floor:50,bossDefeated:true,gold:99999} as any)).toThrow()
 expect(()=>step(model,{type:'descend'})).toThrow()
 expect(()=>step(model,{type:'rest'})).toThrow()
 expect(()=>step(model,{type:'combat',action:{type:'attack'}})).toThrow()
 expect(model.state).toMatchObject({hp:100,gold:100,market:{floor:1}})
})
it('runs real combat, blocks boss escape and requires victory and loot before completion',()=>{
 const initial=newExplorationModel(()=>0)
 const m:ExplorationModel={...initial,state:{...initial.state,market:{...initial.state.market,floor:50},weapons:initial.state.weapons.map(w=>({...w,attack:10000}))}}
 let current=step(m,{type:'door',index:0},0,()=>0)
 expect(current.state.combat?.monsterId).toBe('golden-pharaoh')
 expect(()=>step(current,{type:'combat',action:{type:'flee'}},0,()=>0)).toThrow()
 expect(()=>step(current,{type:'descend'},0,()=>0)).toThrow()
 current=step(current,{type:'combat',action:{type:'attack'}},0,()=>0)
 expect(current.state.combat?.status).toBe('won')
 expect(current.pendingLoot).toBeTruthy()
 expect(()=>step(current,{type:'descend'},0,()=>0)).toThrow()
 current=step(current,{type:'loot'},0,()=>0)
 current=step(current,{type:'descend'},0,()=>0)
 expect(current.state.completed).toBe(true)
 expect(()=>step(current,{type:'descend'},0,()=>0)).toThrow()
})
it('settles room benefits only once and checks purchases, contracts and inventory on the server',()=>{
 const initial=newExplorationModel(()=>0)
 let current=step({...initial,state:{...initial.state,hp:10,market:{...initial.state.market,doors:['rest-oasis']}}},{type:'door',index:0},0,()=>0)
 current=step(current,{type:'rest'},0,()=>0)
 expect(current.state.hp).toBe(100)
 expect(()=>step(current,{type:'rest'},0,()=>0)).toThrow()
 expect(()=>step(current,{type:'buy',id:'ultimate',quantity:-1})).toThrow()
 expect(()=>step(current,{type:'contract'})).toThrow()
 const unchanged=step(current,{type:'equip',kind:'weapon',id:'not-owned'})
 expect(unchanged.state.weaponId).toBe(current.state.weaponId)
})
it('uses the server deadline for sphinx answers and forbids bypassing the penalty',()=>{
 const initial=newExplorationModel(()=>0)
 let current=step({...initial,state:{...initial.state,market:{...initial.state.market,doors:['sphinx']}}},{type:'door',index:0},0,()=>0)
 expect(()=>step(current,{type:'descend'},0)).toThrow()
 expect(()=>step(current,{type:'answer',index:current.visit!.question.correct},0)).toThrow()
 current=step(current,{type:'quiz'},1000)
 current=step(current,{type:'answer',index:current.visit!.question.correct},current.quizDeadline!)
 expect(current.state.hp).toBe(50)
 expect(()=>step(current,{type:'answer',index:0},0)).toThrow()
})
it('keeps the guaranteed supplier on the same floor and permits only its stock to be purchased',()=>{
 const initial=newExplorationModel(()=>0)
 initial.state.market.floor=11
 initial.state.forcedMerchant={floor:11,id:'hasan',phase:'pending'}
 let current=step(initial,{type:'door',index:0},0,()=>0)
 expect(current.view).toBe('merchant')
 const before=current.state.gold
 current=step(current,{type:'buy',id:'not-in-stock',quantity:1},0,()=>0)
 expect(current.state.gold).toBe(before)
 current=step(current,{type:'descend'},0,()=>0)
 expect(current.view).toBe('doors')
 expect(current.state.market.floor).toBe(11)
 expect(current.state.forcedMerchant).toBeUndefined()
})
it('requires the guardian gate or battle to finish before returning to the floor doors',()=>{
 const initial=newExplorationModel(()=>0)
 initial.state.market.floor=34;initial.state.nameStory={choice:'restored'}
 let current=step(initial,{type:'door',index:0},0,()=>0)
 expect(current.visit?.id).toBe('nameless-guardian')
 expect(()=>step(current,{type:'descend'},0,()=>0)).toThrow()
 current=step(current,{type:'story',action:'open-gate'},0,()=>0)
 current=step(current,{type:'story',action:'claim'},0,()=>0)
 expect(current.pendingLoot).toBeTruthy()
 expect(()=>step(current,{type:'story',action:'claim'},0,()=>0)).toThrow()
 current=step(current,{type:'loot'},0,()=>0)
 current=step(current,{type:'descend'},0,()=>0)
 expect(current.view).toBe('doors')
 expect(current.state.market.floor).toBe(34)
})
it('generates treasure on the server and cannot search the same chest twice',()=>{
 const initial=newExplorationModel(()=>0)
 initial.state.market.doors=['chest']
 let current=step(initial,{type:'door',index:0},0,()=>0)
 const before=current.state.gold
 current=step(current,{type:'search'},0,()=>0)
 expect(current.state.gold).toBeGreaterThan(before)
 expect(()=>step(current,{type:'search'},0,()=>0)).toThrow()
})
