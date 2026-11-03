// @vitest-environment node
import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {newRunModel,applyRunAction} from '../supabase/functions/_shared/exploration-routing.js'
import {newGrowthExplorationModel as oldStart,applyExplorationAction as oldAction} from '../supabase/functions/_shared/exploration-engine-growth-v1.js'
import {drawPracticeFloor,floorMonsterPool,drawInvestigationMonster} from '../src/features/exploration/campaign'
import {canOfferPracticeRoom} from '../src/features/exploration/room-rules'
import {newPractice,buyMerchantItem,floorMerchantGoods,castSpell} from '../src/features/exploration/practice-state'
import {getExplorationArmor} from '../src/features/exploration/armor-catalog'
import {drawRoomLoot} from '../src/features/exploration/room-loot'
import {enterShopkeeper} from '../src/features/exploration/shop-state'
import {getShopkeeper} from '../src/features/exploration/shopkeepers'
import {getShamanSpells,learnShamanSpell} from '../src/features/exploration/shaman-stock'
import {plannedSpells,adeptSpells} from '../src/features/exploration/spell-catalog'
import {startMonsterCombat,resolveCombatTurn} from '../src/features/exploration/combat-state'
import {normalizeExplorationSpells} from '../src/features/exploration/spell-availability'

const copy=<T,>(value:T):T=>JSON.parse(JSON.stringify(value))
const profile=(floor:number)=>({...newPractice(()=>.2,'practice'),balanceVersion:2 as const,market:{...newPractice().market,floor}})
it('freezes the exact production growth engine retrieved before this release',()=>{
 const text=readFileSync('supabase/functions/_shared/exploration-engine-growth-v1.js','utf8').replaceAll('\r\n','\n')
 expect(createHash('sha256').update(text).digest('hex')).toBe('c114f81b398c1a49513540e84179494872c7932a5bec0506703f3c0572dd41cd')
 expect(newRunModel(1,()=>.2).state.balanceVersion).toBe(2)
 expect(oldStart(()=>.2).state.balanceVersion).toBeUndefined()
 expect(newRunModel(1,()=>.2,1)).toEqual(oldStart(()=>.2))
 expect(()=>newRunModel(1,()=>.2,99)).toThrow()
 expect(()=>applyRunAction({...newRunModel(1,()=>.2),state:{...profile(1),balanceVersion:99}},{type:'door',index:0})).toThrow('ENGINE_VERSION_MISMATCH')
})
it('continues saved and active old growth runs with the exact production engine',()=>{
 let saved=copy(oldStart(()=>.2))
 saved.state.market.doors=['monster'];saved.state.market.monsterIds=['bandage-mummy']
 for(const action of [{type:'allocate-stat',stat:'health'},{type:'door',index:0},{type:'combat',action:{type:'attack'}}]){
  const before=copy(saved),expected=oldAction(before,action,1000,()=>.8)
  expect(applyRunAction(copy(saved),action,1000,()=>.8)).toEqual(expected)
  expect(saved).toEqual(before)
  saved=copy(expected)
 }
 expect(saved.state.balanceVersion).toBeUndefined()
})
it('keeps future old-run armor purchases and magic offers unchanged after restoring',()=>{
 const base=oldStart(()=>.2),state={...base.state,gold:99999,market:{...base.state.market,floor:48,doors:['magic-nefera']},growth:{...base.state.growth,allocations:{...base.state.growth.allocations,health:5}}}
 const saved=copy({...base,state})
 const expected=oldAction(saved,{type:'door',index:0},1000,()=>.2)
 expect(applyRunAction(copy(saved),{type:'door',index:0},1000,()=>.2)).toEqual(expected)
 const learned=expected.state.shamanStock.spellIds[0]
 expect(applyRunAction(copy(expected),{type:'learn',id:learned},1000,()=>.2)).toEqual(oldAction(copy(expected),{type:'learn',id:learned},1000,()=>.2))
 const shop={...base,view:'merchant',state:{...state,market:{...state.market,weaponIds:[],armorIds:['golden-scales-aegis']}}}
 const purchased=applyRunAction(copy(shop),{type:'buy',id:'golden-scales-aegis',quantity:1},1000,()=>.2)
 expect(purchased).toEqual(oldAction(copy(shop),{type:'buy',id:'golden-scales-aegis',quantity:1},1000,()=>.2))
 expect(purchased.state.armor.at(-1)).toMatchObject({reduction:6,magicReduction:6,maxHpBonus:35,evasion:10})
})
it('excludes early freeze encounters and dormant giants across every early floor',()=>{
 for(let floor=1;floor<=20;floor++){
  const state=profile(floor)
  for(const intermediate of [false,true])expect(floorMonsterPool(floor,intermediate,true).some(item=>item.value==='hourglass-sentinel')).toBe(false)
  for(let n=0;n<100;n++)expect(drawInvestigationMonster(floor,()=>n/100,true)).not.toBe('hourglass-sentinel')
  for(const id of ['sleeping-giant','sealed-scarab'] as const)expect(canOfferPracticeRoom(state,id)).toBe(false)
  for(let n=0;n<20;n++){
   const doors=drawPracticeFloor(floor,()=>n/20,state).doors
   expect(doors).not.toContain('sleeping-giant');expect(doors).not.toContain('sealed-scarab')
  }
 }
 expect(floorMonsterPool(21,true,true).some(item=>item.value==='hourglass-sentinel')).toBe(true)
 expect(canOfferPracticeRoom(profile(21),'sleeping-giant')).toBe(true)
 expect(canOfferPracticeRoom(profile(21),'sealed-scarab')).toBe(true)
 expect(floorMonsterPool(13,true).map(item=>item.value)).toEqual(['hourglass-sentinel'])
})
it.each([31,40,48,50])('replaces high magic with five adept spells at floor %i',floor=>{
 const state=enterShopkeeper({...profile(floor),gold:99999},getShopkeeper('nefera'),()=>.2)
 expect(state.shamanStock!.spellIds).toHaveLength(5)
 expect(state.shamanStock!.spellIds.every(id=>adeptSpells.some(spell=>spell.id===id))).toBe(true)
 for(const id of state.shamanStock!.spellIds){
  const next=learnShamanSpell(state,id),spell=adeptSpells.find(item=>item.id===id)!
  expect(next.spells.at(-1)).toMatchObject({id,mana:spell.mana})
  expect(next.gold).toBe(state.gold-spell.learnPrice)
 }
 expect(learnShamanSpell(state,'judgment-of-ra')).toBe(state)
 expect(enterShopkeeper(state,getShopkeeper('nefera'),()=>.9)).toEqual(state)
})
it('offers high spells from 51 with +2 mana, preserving legacy and learned costs',()=>{
 for(const floor of [51,62,74,80]){
  const state=enterShopkeeper(profile(floor),getShopkeeper('nefera'),()=>.2)
  expect(state.shamanStock!.spellIds).toHaveLength(5)
  for(const id of state.shamanStock!.spellIds){
   const base=plannedSpells.find(spell=>spell.id===id)!,current=getShamanSpells(state).find(spell=>spell.id===id)!
   expect(base.tier).toBe('ultimate');expect(current.mana).toBe(base.mana+2)
  }
 }
 const legacy={...profile(48),balanceVersion:undefined}
 expect(getShamanSpells(legacy).find(spell=>spell.id==='judgment-of-ra')!.mana).toBe(16)
 const saved={...profile(60),spells:[{...plannedSpells.find(spell=>spell.id==='judgment-of-ra')!,message:''}]}
 expect(normalizeExplorationSpells(saved).spells[0].mana).toBe(16)
})
it('nerfs newly obtained balanced armor in shops and loot, leaving inventory snapshots alone',()=>{
 const legacy=getExplorationArmor().find(item=>item.id==='golden-scales-aegis')!,state={...profile(38),gold:99999,market:{...profile(38).market,armorIds:[legacy.id]}}
 expect(floorMerchantGoods(state).find(item=>item.id===legacy.id)!.gear).toMatchObject({reduction:5,magicReduction:5,maxHpBonus:25,evasion:5})
 expect(buyMerchantItem(state,legacy.id).armor.at(-1)).toMatchObject({reduction:5,maxHpBonus:25})
 const lootState={...state,acquiredIds:[...getExplorationArmor().filter(item=>item.id!==legacy.id).map(item=>item.id)]}
 let found=false
 for(let roll=0;roll<100;roll++){
  const loot=drawRoomLoot(lootState,'ultimate',()=>roll/100)
  if(loot.id===legacy.id){expect(loot).toMatchObject({gear:{reduction:5,magicReduction:5,maxHpBonus:25,evasion:5}});found=true}
 }
 expect(found).toBe(true)
 expect(legacy).toMatchObject({reduction:6,maxHpBonus:35,evasion:10})
})
it('executes adept damage, freeze, drain, shield and cleansing rather than just showing descriptions',()=>{
 const state={...profile(35),hp:40,mp:40,spells:adeptSpells.map(spell=>({...spell,message:spell.description}))}
 for(const [id,damage] of [['gold-dust-lance',58],['frost-chain',48],['twilight-drain',44]] as const){
  const combat=startMonsterCombat({...state,equippedSpells:[id]},'ancient-giant')
  const result=resolveCombatTurn(combat,{type:'magic',id},()=>0)
  expect(combat.combat!.enemyHp-result.playerState.combat!.enemyHp).toBe(damage-3)
  if(id==='frost-chain')expect(result.playerState.combat!.effects).toContainEqual(expect.objectContaining({kind:'freeze'}))
  if(id==='twilight-drain')expect(result.playerState.hp).toBe(52)
 }
 const shield=startMonsterCombat({...state,equippedSpells:['lapis-bulwark']},'ancient-giant')
 expect(resolveCombatTurn(shield,{type:'magic',id:'lapis-bulwark'},()=>.9).playerState.combat!.shield!.remaining).toBe(42)
 const healed=castSpell({...state,equippedSpells:['blooming-lotus'],playerEffects:[{kind:'burn' as const,amount:80,turns:3}]},'blooming-lotus')
 expect(healed.hp).toBe(88);expect(healed.mp).toBe(27);expect(healed.playerEffects).toEqual([])
})
