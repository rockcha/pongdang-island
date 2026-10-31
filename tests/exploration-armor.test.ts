// Pin attack variation to its midpoint for these status, armor and presentation fixtures.
// Real random damage is covered in exploration-attack-roll.test.ts.
vi.mock('@/features/exploration/attack-roll',async importOriginal=>({...await importOriginal<typeof import('@/features/exploration/attack-roll')>(),rollBasicAttack:(attack:number)=>Math.max(1,attack)}))
import {expect,it,vi} from 'vitest'
import {existsSync,readFileSync} from 'node:fs'
import {plannedSpells} from '@/features/exploration/spell-catalog'
import {explorationArmor,armorCatalog,starterArmor} from '@/features/exploration/armor-catalog'
import {newPractice,equipGear,playerMaxHp,incomingDamage,basicAttackEvasion,buyMerchantItem,practiceSpells} from '@/features/exploration/practice-state'
import {startScorpionCombat,resolveCombatTurn} from '@/features/exploration/combat-state'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
function armored(id:string){const gear=explorationArmor.find(item=>item.id===id)!;return {...newPractice(),armor:[starterArmor,gear],armorId:gear.id}}
it('connects every armor and spell to a generated, saved image',()=>{
 const manifest=JSON.parse(readFileSync('assets/exploration/equipment-manifest.json','utf8')) as {images:{source:string;output:string}[]}
 const images=[...armorCatalog.map(item=>item.gear.image),...practiceSpells.map(item=>item.image),...plannedSpells.map(item=>item.image)]
 expect(images).toHaveLength(39)
 expect(new Set(images).size).toBe(39)
 for(const image of images){
  expect(image).toBeTruthy()
  if(image!.endsWith('.svg')){expect(existsSync('public'+image)).toBe(true);expect(readFileSync('public'+image,'utf8')).toContain('<svg');continue}
  const record=manifest.images.find(item=>item.output==='public'+image)
  expect(record).toBeTruthy()
  expect(existsSync(record!.source)).toBe(true)
  expect(existsSync(record!.output)).toBe(true)
 }
})
it('registers five distinct builds per tier and sells entry armor at its catalog price',()=>{
 expect(armorCatalog).toHaveLength(19)
 for(const tier of ['starter','advanced','ultimate'])expect(new Set(explorationArmor.filter(item=>item.tier===tier).map(item=>item.role)).size).toBe(5)
 const gear=explorationArmor[0],bought=buyMerchantItem(newPractice(()=>0),gear.id)
 expect(bought.armor).toContain(gear);expect(bought.gold).toBe(100000-gear.price)
 expect(buyMerchantItem(bought,gear.id)).toBe(bought)
})
it('uses the matching defense and allows evasion only against basic physical attacks',()=>{
 const state=armored('nightwind-shadow-garb')
 expect(incomingDamage(state,20,'physical')).toBe(16)
 expect(incomingDamage(state,20,'magic')).toBe(16)
 expect(basicAttackEvasion(state,'physical')).toBe(30)
 expect(basicAttackEvasion(state,'magic')).toBe(0)
 const physical=armored('sun-king-warplate')
 expect(incomingDamage(physical,20,'physical')).toBe(11)
 expect(incomingDamage(physical,20,'magic')).toBe(17)
 expect(incomingDamage(physical,8,'physical')).toBe(1)
 expect(incomingDamage(physical,8,'physical',8)).toBe(0)
})
it('changes maximum health without healing and clamps health when removing armor',()=>{
 const state=armored('immortal-royal-robe')
 expect(playerMaxHp(state)).toBe(165);expect(state.hp).toBe(100)
 const unequipped=equipGear({...state,hp:170},'armor',starterArmor.id)
 expect(playerMaxHp(unequipped)).toBe(100);expect(unequipped.hp).toBe(100)
 const reequipped=equipGear(unequipped,'armor',state.armorId)
 expect(playerMaxHp(reequipped)).toBe(165);expect(reequipped.hp).toBe(100)
 const active=startScorpionCombat(state)
 expect(equipGear(active,'armor',starterArmor.id)).toBe(active)
})
it('heals and steals life up to the equipped maximum health rather than 100',()=>{
 const state={...startScorpionCombat(armored('immortal-royal-robe')),hp:156,spells:practiceSpells,equippedSpells:['light']}
 expect(resolveCombatTurn(state,{type:'magic',id:'light'},()=>.99).playerState.hp).toBe(165)
 const weapon=explorationWeapons.find(item=>item.id==='osiris-lifereaper')!
 expect(resolveCombatTurn({...state,weapons:[weapon],weaponId:weapon.id},{type:'attack'},()=>0).playerState.hp).toBe(165)
})
it('applies physical armor and evasion during real combat turns',()=>{
 const plate=startScorpionCombat(armored('sun-king-warplate'))
 expect(resolveCombatTurn(plate,{type:'attack'},()=>.99).state.hp).toBe(99)
 const evasive=startScorpionCombat(armored('nightwind-shadow-garb'))
 const rolls=[.99,.29]
 const result=resolveCombatTurn(evasive,{type:'attack'},()=>rolls.shift()??.99)
 expect(result.state.hp).toBe(100);expect(result.events.some(event=>event.effect==='evade')).toBe(true)
})
