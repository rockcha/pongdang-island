// @vitest-environment node
import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {newRunModel,applyRunAction} from '../supabase/functions/_shared/exploration-routing.js'
import {newExplorationModel,applyExplorationAction} from '../supabase/functions/_shared/exploration-engine-v2.js'
import {playerMaxHp} from '../src/features/exploration/practice-state'

it('preserves the exact deployed v2 engine for existing saved explorations',()=>{
 // Captured from the production v2 source before the growth release.
 const originalHash='3e94188cf8ab807c74fcec8f7ac44e3b950fd89639a48d0b7795da3dfb700e70'
 const frozen=readFileSync('supabase/functions/_shared/exploration-engine-v2.js','utf8').replaceAll('\r\n','\n')
 expect(createHash('sha256').update(frozen).digest('hex')).toBe(originalHash)
})
it('keeps old client starts on the previous rules and rejects unknown growth versions',()=>{
 expect(newRunModel(undefined,()=>.2)).toEqual(newExplorationModel(()=>.2))
 expect(()=>newRunModel(99,()=>.2)).toThrow()
})
it('continues a restored pre-growth run with the exact previous engine',()=>{
 const initial=newExplorationModel(()=>.2)
 const saved=JSON.parse(JSON.stringify({...initial,state:{...initial.state,market:{...initial.state.market,floor:11,doors:['rest-oasis']}}}))
 const routed=applyRunAction(saved,{type:'door',index:0},1000,()=>.2)
 expect(routed).toEqual(applyExplorationAction(saved,{type:'door',index:0},1000,()=>.2))
 expect(routed.state.growth).toBeUndefined()
 expect(routed.state.equippedSpells).not.toContain('mana-bolt')
 expect(()=>applyRunAction(saved,{type:'allocate-stat',stat:'health'},1000,()=>.2)).toThrow()
})
it('persists new growth through serialization and spends one checkpoint point only once',()=>{
 const model=newRunModel(1,()=>.2)
 const checkpoint=JSON.parse(JSON.stringify({...model,state:{...model.state,market:{...model.state.market,floor:11}}}))
 expect(()=>applyRunAction(checkpoint,{type:'door',index:0},1000,()=>.2)).toThrow()
 const grown=applyRunAction(checkpoint,{type:'allocate-stat',stat:'health'},1000,()=>.2)
 expect(grown.state.growth.allocations.health).toBe(1)
 expect(playerMaxHp(grown.state)).toBe(105)
 expect(grown.state.hp).toBe(105)
 expect(grown.state.equippedSpells).toEqual(['mana-bolt'])
 expect(()=>applyRunAction(JSON.parse(JSON.stringify(grown)),{type:'allocate-stat',stat:'health'},1000,()=>.2)).toThrow()
})
