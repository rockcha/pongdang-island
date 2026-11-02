// @vitest-environment node
import {expect,it} from 'vitest'
import {newGrowthExplorationModel,applyExplorationAction} from '../src/features/exploration/server-engine'
import {gearSalePrice,spellSalePrice} from '../src/features/exploration/room-loot'
import {plannedSpells} from '../src/features/exploration/spell-catalog'
import {acquiredItemIds} from '../src/features/exploration/acquisition-history'
import {canOfferPracticeRoom} from '../src/features/exploration/room-rules'

function saleModel(){
 let model=applyExplorationAction(newGrowthExplorationModel(()=>.2),{type:'allocate-stat',stat:'attack'})
 const spell=plannedSpells[0]
 model.state={...model.state,spells:[...model.state.spells,{...spell,message:spell.description}],weapons:[...model.state.weapons,{id:'sale-sword',name:'판매용 검',attack:12,description:''}],armor:[...model.state.armor,{id:'sale-armor',name:'판매용 갑옷',reduction:3,description:''}],market:{...model.state.market,doors:['scales']}}
 return applyExplorationAction(model,{type:'door',index:0},0,()=>.2)
}
it('sells each unequipped category once and preserves acquisition history',()=>{
 const model=saleModel()
 for(const kind of ['weapon','armor','magic'] as const){
  const item=kind==='weapon'?model.state.weapons[1]:kind==='armor'?model.state.armor[1]:model.state.spells[1]
  const next=applyExplorationAction(model,{type:'sell',kind,id:item.id})
  const price=kind==='magic'?spellSalePrice(model.state.spells[1]):gearSalePrice(kind==='weapon'?model.state.weapons[1]:model.state.armor[1])
  expect(next.state.gold).toBe(model.state.gold+price)
  expect(acquiredItemIds(next.state).has(item.id)).toBe(true)
  expect(next.state.weaponId).toBe(model.state.weaponId)
  expect(next.state.armorId).toBe(model.state.armorId)
  expect(next.state.equippedSpells).toEqual(model.state.equippedSpells)
  const repeated=applyExplorationAction(next,{type:'sell',kind,id:item.id})
  expect(repeated.state.gold).toBe(next.state.gold)
 }
})
it('protects equipped gear and magic and restricts sales to the exchange',()=>{
 const model=saleModel()
 for(const [kind,id] of [['weapon',model.state.weaponId],['armor',model.state.armorId],['magic',model.state.equippedSpells[0]]] as const){
  const next=applyExplorationAction(model,{type:'sell',kind,id})
  expect(next.state).toEqual(model.state)
 }
 expect(()=>applyExplorationAction({...model,view:'doors'},{type:'sell',kind:'magic',id:model.state.spells[1].id})).toThrow()
 expect(spellSalePrice({...model.state.spells[1],learnPrice:999999})).toBe(Math.floor(plannedSpells[0].learnPrice*.4))
})
it('offers the exchange when the only saleable item is unequipped magic',()=>{
 const {state}=saleModel()
 const magicOnly={...state,recentRooms:[],weapons:state.weapons.slice(0,1),armor:state.armor.slice(0,1)}
 expect(canOfferPracticeRoom(magicOnly,'scales')).toBe(true)
 expect(canOfferPracticeRoom({...magicOnly,spells:magicOnly.spells.filter(item=>magicOnly.equippedSpells.includes(item.id))},'scales')).toBe(false)
})
