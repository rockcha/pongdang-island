// @vitest-environment node
import {expect,it} from 'vitest'
import {newRunModel,applyRunAction} from '../supabase/functions/_shared/exploration-routing.js'
import {newExplorationModel as newV1} from '../supabase/functions/_shared/exploration-engine-v1.js'

it.each(['v1','v2','growth'])('allows shaman potions with existing purchase safeguards for %s saves',version=>{
 const initial=version==='v1'?newV1(()=>.2):newRunModel(version==='growth'?1:undefined,()=>.2)
 const model={...initial,view:'shaman',state:{...initial.state,gold:1000}}
 if(model.state.growth)model.state.growth.allocations.attack=1
 for(const [id,kind] of [['health-potion','health'],['mana-potion','mana']]){
  const bought=applyRunAction(model,{type:'buy',id,quantity:2},0,()=>.2)
  expect(bought.view).toBe('shaman')
  expect(bought.state.gold).toBe(800)
  expect(bought.state.potions[kind]).toBe(model.state.potions[kind]+2)
  expect(bought.state.weapons).toEqual(model.state.weapons)
  expect(bought.state.spells).toEqual(model.state.spells)
  const poor={...model,state:{...model.state,gold:99}}
  expect(applyRunAction(poor,{type:'buy',id,quantity:1}).state.gold).toBe(99)
  for(const quantity of [0,-1,1.5,10000])expect(()=>applyRunAction(model,{type:'buy',id,quantity})).toThrow()
  expect(()=>applyRunAction({...model,view:'doors'},{type:'buy',id,quantity:1})).toThrow()
  const fighting={...model,state:{...model.state,combat:{status:'active',enemyHp:10,turn:0}}}
  expect(applyRunAction(fighting,{type:'buy',id,quantity:1}).state.gold).toBe(1000)
 }
 expect(()=>applyRunAction(model,{type:'buy',id:'merchant-dagger',quantity:1})).toThrow()
 expect(model.state.gold).toBe(1000)
})
