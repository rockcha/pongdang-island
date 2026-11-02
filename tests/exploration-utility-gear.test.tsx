import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {newPractice,castSpell,practiceSpells,spellManaCost,usePotion,potionRecoveryAmount,equipGear} from '@/features/exploration/practice-state'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {startMonsterCombat,resolveCombatTurn} from '@/features/exploration/combat-state'
import {CombatMagicDialog} from '@/features/exploration/combat-magic-dialog'
import {PotionChoiceDialog} from '@/features/exploration/potion-choice-dialog'

afterEach(cleanup)
const staff=explorationWeapons.find(x=>x.id==='inscription-mage-staff')!
function equipped(armorId?:string,withStaff=false){const base=newPractice(()=>0),armor=explorationArmor.find(x=>x.id===armorId);return {...base,...(withStaff?{weapons:[...base.weapons,staff],weaponId:staff.id}:{}),...(armor?{armor:[...base.armor,armor],armorId:armor.id}:{}),spells:practiceSpells,equippedSpells:['ember','tide'],potions:{health:3,mana:3}}}
it('uses the discounted mana cost for availability, casting, logs and the selection modal',()=>{
 const state={...equipped(undefined,true),mp:5},combat=startMonsterCombat(state,'bandage-mummy')
 expect(castSpell(state,'ember').mp).toBe(0)
 const result=resolveCombatTurn(combat,{type:'magic',id:'ember'},()=>.99)
 expect(result.playerState.mp).toBe(0);expect(result.events[0].text).toContain('마나 5 소모')
 render(<CombatMagicDialog state={combat} open onOpenChange={()=>{}} onCast={()=>{}}/>)
 expect(screen.getByRole('button',{name:'작은 불꽃 · MP 5 시전'})).toHaveProperty('disabled',false)
})
it('never makes magic free and rejects an unaffordable discounted cast without advancing the turn',()=>{
 const base=equipped(undefined,true),spell={...practiceSpells[0],mana:1},state={...base,spells:[spell],mp:1}
 expect(spellManaCost(state,spell)).toBe(1);expect(castSpell(state,'ember').mp).toBe(0)
 const empty=startMonsterCombat({...state,mp:0},'bandage-mummy')
 expect(resolveCombatTurn(empty,{type:'magic',id:'ember'}).state).toBe(empty)
})
it.each([10,39,40])('restores victory mana once, capped at the maximum, from starting mana %s',mp=>{
 const state=startMonsterCombat({...equipped('echo-priest-robe'),mp},'sand-scorpion'),won=resolveCombatTurn({...state,combat:{...state.combat!,enemyHp:1}},{type:'attack'},()=>.99)
 expect(won.state.mp).toBe(Math.min(40,mp+3));expect(won.playerState.mp).toBe(won.state.mp)
 expect(won.events.filter(x=>x.source==='잔향')).toHaveLength(mp===40?0:1)
 expect(resolveCombatTurn(won.state,{type:'attack'}).state).toBe(won.state)
})
it('does not grant victory mana for fleeing, dying or merely owning the robe',()=>{
 const state=startMonsterCombat({...equipped('echo-priest-robe'),mp:10},'sand-scorpion')
 expect(resolveCombatTurn(state,{type:'flee'},()=>0).state.mp).toBe(10)
 expect(resolveCombatTurn({...state,hp:1},{type:'attack'},()=>.99).state).toMatchObject({mp:10,combat:{status:'lost'}})
 const unequipped=equipGear({...equipped('echo-priest-robe'),mp:10},'armor','old-diving-suit'),fight=startMonsterCombat(unequipped,'sand-scorpion')
 expect(resolveCombatTurn({...fight,combat:{...fight.combat!,enemyHp:1}},{type:'attack'},()=>.99).state.mp).toBe(10)
})
it('grants the dawn shield only at entry, retains partial absorption across turns, then consumes it',()=>{
 const base=equipped('dawn-guardian-garb'),start=startMonsterCombat(base,'bandage-mummy')
 expect(start.combat?.shield).toEqual({remaining:8})
 const first=resolveCombatTurn(start,{type:'magic',id:'tide'},()=>.99).state
 expect(first.combat?.shield).toBeUndefined()
 const second=resolveCombatTurn(first,{type:'attack'},()=>.99).state
 expect(second.combat?.shield).toBeUndefined()
 const third=resolveCombatTurn(second,{type:'attack'},()=>.99).state
 expect(third.combat?.shield).toBeUndefined()
 const reequipped=equipGear(equipGear(third,'armor','old-diving-suit',true),'armor','dawn-guardian-garb',true)
 expect(reequipped.combat?.shield).toBeUndefined()
 const enteredLate=equipGear(startMonsterCombat(equipGear(base,'armor','old-diving-suit'),'sand-scorpion'),'armor','dawn-guardian-garb',true)
 expect(enteredLate.combat?.shield).toBeUndefined()
})
it('absorbs magic damage and clears the opening shield after victory or escape',()=>{
 const start=startMonsterCombat(equipped('dawn-guardian-garb'),'obsidian-anubis'),hit=resolveCombatTurn(start,{type:'attack'},()=>.34)
 expect(hit.events.some(x=>x.effect==='shield'&&x.attackType==='magic')).toBe(true)
 const ordinary=startMonsterCombat(equipped('dawn-guardian-garb'),'sand-scorpion')
 expect(resolveCombatTurn({...ordinary,combat:{...ordinary.combat!,enemyHp:1}},{type:'attack'},()=>.99).state.combat?.shield).toBeUndefined()
 expect(resolveCombatTurn(ordinary,{type:'flee'},()=>0).state.combat?.shield).toBeUndefined()
})
it('adds potion healing before burn reduction, caps at resource maxima, and works during combat',()=>{
 const state={...equipped('alchemist-overcoat'),hp:20,mp:0}
 expect(usePotion(state,'health').hp).toBe(55);expect(usePotion(state,'mana').mp).toBe(20)
 const burning={...state,playerEffects:[{kind:'burn' as const,amount:40,turns:2}]}
 expect(potionRecoveryAmount(burning,'health')).toBe(21);expect(usePotion(burning,'health').hp).toBe(41)
 expect(usePotion({...state,hp:110},'health').hp).toBe(115);expect(usePotion({...state,mp:35},'mana').mp).toBe(40)
 const result=resolveCombatTurn(startMonsterCombat(state,'sand-scorpion'),{type:'potion',kind:'mana'},()=>.99)
 expect(result.playerState.mp).toBe(20);expect(result.events[0].manaRestored).toBe(20)
 const onUse=vi.fn(()=>true);render(<PotionChoiceDialog state={state} open onOpenChange={()=>{}} onUse={onUse}/>)
 expect(screen.getByRole('dialog').textContent).toContain('35');expect(screen.getByRole('dialog').textContent).toContain('20')
 fireEvent.click(screen.getByRole('button',{name:'마나 포션 마시기'}));expect(onUse).toHaveBeenCalledWith('mana')
})
