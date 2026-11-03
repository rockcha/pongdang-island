// @vitest-environment node
import {expect,it} from 'vitest'
import * as v1 from '../supabase/functions/_shared/exploration-engine-v1.js'
import * as v2 from '../supabase/functions/_shared/exploration-engine-v2.js'
import * as growthV1 from '../supabase/functions/_shared/exploration-engine-growth-v1.js'
import * as current from '../supabase/functions/_shared/exploration-engine.js'
import {applyRunAction} from '../supabase/functions/_shared/exploration-routing.js'

const profiles=[
 {name:'legacy v1',create:v1.newExplorationModel},
 {name:'legacy v2',create:v2.newExplorationModel},
 {name:'saved growth',create:growthV1.newGrowthExplorationModel},
 {name:'current balance',create:current.newGrowthExplorationModel},
]
for(const profile of profiles){
 for(const cause of ['physical','magic','bleed'] as const){
  it(`${profile.name}: revives exactly once from lethal ${cause} damage through production routing`,()=>{
   const model=profile.create(()=>.2)
   model.view='combat'
   model.state={...model.state,hp:1,mp:0,soulLantern:'ready',maxHpSacrifice:10,potions:{health:0,mana:2},combat:{monsterId:'ancient-giant',enemyHp:1000,status:'active',turn:1,effects:[]},...(cause==='bleed'?{playerEffects:[{kind:'bleed',amount:3,turns:2}]}:{})}
   if(model.state.growth)model.state.growth.allocations.health=1
   const saved=JSON.parse(JSON.stringify(model)),random=()=>cause==='magic'?0:.99
   const next=applyRunAction(saved,{type:'combat',action:{type:'potion',kind:'mana'}},1000,random)
   expect(next.state.hp).toBe(20)
   expect(next.state.soulLantern).toBe('spent')
   expect(next.state.combat.status).toBe('active')
   expect(next.result.events.filter(event=>event.kind==='system'&&event.healing===20)).toHaveLength(1)
   expect(saved.state.soulLantern).toBe('ready');expect(saved.state.hp).toBe(1)
   if(cause==='bleed')expect(next.result.events.some(event=>event.kind==='monster')).toBe(false)
   const second=applyRunAction(JSON.parse(JSON.stringify({...next,state:{...next.state,hp:1}})),{type:'combat',action:{type:'potion',kind:'mana'}},1000,()=>.99)
   expect(second.state.hp).toBe(0);expect(second.state.combat.status).toBe('lost')
   expect(second.result.events.some(event=>event.kind==='system'&&event.healing)).toBe(false)
  })
 }
}
