// @vitest-environment node
import {afterEach,expect,it} from 'vitest'
import {canUseTrainingLab} from '../src/features/training/access'
import {companions,trainingChances,statsAtLevel,xpForLevel,type Rarity} from '../src/features/training/catalog'
import {isEligible,newTrainingSave,restoreTrainingSave,trainingStorageKey,trainCompanion} from '../src/features/training/local-state'
import {abilityBlock,addStatus,effectiveStat,newTrainingBattle,practiceAction,receiveDamage,testIncomingHit} from '../src/features/training/battle'

afterEach(()=>{companions[0].rarity='common'})
it('limits entry to the development operator account and isolates local storage keys',()=>{
 expect(canUseTrainingLab(true,'0@0.com',true)).toBe(true)
 expect(canUseTrainingLab(false,'0@0.com',true)).toBe(false)
 expect(canUseTrainingLab(true,'another@example.com',true)).toBe(false)
 expect(canUseTrainingLab(true,'0@0.com',false)).toBe(false)
 expect(trainingStorageKey('one')).not.toBe(trainingStorageKey('two'))
})
it('starts with exactly 100 local shards and four distinct bond-tagged storage fixtures',()=>{
 const save=newTrainingSave();expect(save.shards).toBe(100);expect(save.units).toHaveLength(4)
 expect(new Set(save.units.map(item=>item.id)).size).toBe(4)
 expect(save.units.every(isEligible)).toBe(true)
 expect(save.units.every(item=>!item.trained&&item.level===1&&item.xp===0)).toBe(true)
 expect(isEligible({...save.units[0],tankId:'tank'})).toBe(false)
 expect(isEligible({...save.units[0],tags:[]})).toBe(false)
})
it.each(Object.entries(trainingChances) as [Rarity,number][])('charges one shard and respects the %s probability boundary', (rarity,chance)=>{
 companions[0].rarity=rarity
 const before=newTrainingSave(),id=before.units[0].id
 const win=trainCompanion(before,id,()=>(chance-.01)/100),fail=trainCompanion(before,id,()=>chance/100)
 expect(win.success).toBe(true);expect(win.save.units[0].trained).toBe(true)
 expect(fail.success).toBe(false);expect(fail.save.units[0].trained).toBe(false)
 expect(win.save.shards).toBe(99);expect(fail.save.shards).toBe(99)
 expect(fail.save.units).toHaveLength(4);expect(before.shards).toBe(100);expect(before.units[0].trained).toBe(false)
})
it('rejects ineligible, missing and unaffordable training without consuming anything',()=>{
 const save=newTrainingSave(),unit=save.units[0]
 expect(trainCompanion(save,'missing').save).toBe(save)
 const tank={...save,units:[{...unit,tankId:'tank'}]};expect(trainCompanion(tank,unit.id).save).toBe(tank)
 const untagged={...save,units:[{...unit,tags:[]}]};expect(trainCompanion(untagged,unit.id).save).toBe(untagged)
 const empty={...save,shards:0};expect(trainCompanion(empty,unit.id).save).toBe(empty)
})
it('keeps individual progression, carries XP and stops charging at level ten',()=>{
 let save=newTrainingSave();const id=save.units[0].id
 save=trainCompanion(save,id,()=>0).save
 save=trainCompanion(save,id,()=>{throw Error('Growth should not roll again')}).save
 expect(save.units[0]).toMatchObject({level:2,xp:10,trained:true});expect(save.units[1].trained).toBe(false)
 for(let n=0;n<17;n++)save=trainCompanion(save,id).save
 expect(save.units[0]).toMatchObject({level:10,xp:0});expect(save.shards).toBe(81)
 expect(trainCompanion(save,id).save).toBe(save)
 expect(xpForLevel(1)).toBe(20);expect(xpForLevel(9)).toBe(100)
 expect(statsAtLevel(companions[2],10)).toMatchObject({hp:160,attack:38,critical:16.8,evasion:10.9})
})
it('restores only known fixtures, preserving training through local tank transfers and malformed saves safely',()=>{
 const save=trainCompanion(newTrainingSave(),'trial-round-triassurus',()=>0).save
 save.units[0].tankId='trial-aquarium'
 const restored=restoreTrainingSave(JSON.stringify(save));expect(restored.units[0].trained).toBe(true);expect(restored.units[0].tankId).toBe('trial-aquarium')
 expect(restoreTrainingSave('broken')).toEqual(newTrainingSave())
 expect(restoreTrainingSave(JSON.stringify({...save,shards:-1}))).toEqual(newTrainingSave())
 expect(restoreTrainingSave(JSON.stringify({...save,units:[{...save.units[0],level:999}]})).units[0].level).toBe(1)
})
function ready(index=0){const unit={...newTrainingSave().units[index],trained:true};return {unit,battle:newTrainingBattle(unit),definition:companions[index]}}
it('uses a passive 2000 HP dummy and deals real damage without awarding inventory or XP',()=>{
 const {unit,battle,definition}=ready(),next=practiceAction(battle,unit,definition.basic.id,()=>.99)
 expect(battle.dummy.hp).toBe(2000);expect(battle.dummy.stats).toMatchObject({defense:0,resistance:0,evasion:0,attack:0})
 expect(next.dummy.hp).toBe(1980);expect(next.player.hp).toBe(150);expect(next.turn).toBe(1)
 expect(unit.xp).toBe(0);expect(battle.dummy.hp).toBe(2000)
 const untrained={...unit,trained:false};expect(practiceAction(battle,untrained,definition.basic.id)).toBe(battle)
})
it('enforces cooldowns and silence, without spending a turn for blocked skills',()=>{
 const {unit,battle,definition}=ready(),skill=definition.skills[0]
 let next=practiceAction(battle,unit,skill.id,()=>.99)
 expect(next.cooldowns[skill.id]).toBe(3);expect(next.dummy.effects).toContainEqual({kind:'weaken',amount:20,turns:2})
 expect(practiceAction(next,unit,skill.id)).toBe(next)
 for(let n=0;n<3;n++)next=practiceAction(next,unit,definition.basic.id,()=>.99)
 expect(abilityBlock(next,unit,skill)).toBeNull()
 next.player.effects=[{kind:'silence',amount:1,turns:2}]
 expect(practiceAction(next,unit,skill.id)).toBe(next)
 expect(practiceAction(next,unit,definition.basic.id,()=>.99)).not.toBe(next)
 next.player.effects=[{kind:'root',amount:1,turns:2}]
 expect(abilityBlock(next,unit,skill)).toBeNull()
})
it('activates round resilience once and reduces damage through the ammonite shield passive',()=>{
 const {unit,battle}=ready();let hit=battle
 for(let n=0;n<3;n++)hit=testIncomingHit(hit,unit,'physical',()=>.99)
 expect(hit.player.passiveUsed).toBe(true);expect(hit.player.shield).toBe(23);expect(hit.cue?.passive).toBe('둥글게 버티기')
 const again=testIncomingHit(hit,unit,'physical',()=>.99);expect(again.player.shield).toBe(0);expect(again.cue?.passive).toBeUndefined()
 const ammo=ready(1),shielded=practiceAction(ammo.battle,ammo.unit,ammo.definition.skills[0].id)
 expect(shielded.player.shield).toBe(34)
 const next=testIncomingHit(shielded,ammo.unit,'physical',()=>.99)
 expect(next.player.shield).toBe(11);expect(next.player.hp).toBe(170)
})
it('caps current stacks and grants the chromis shield after casting',()=>{
 const fish=ready(2);let battle=fish.battle
 for(let n=0;n<3;n++)battle=practiceAction(battle,fish.unit,fish.definition.basic.id,()=>.99)
 expect(battle.focus).toBe(2);expect(battle.focusTurns).toBe(2)
 const chromis=ready(3),next=practiceAction(chromis.battle,chromis.unit,chromis.definition.skills[0].id,()=>.99)
 expect(next.player.shield).toBe(6);expect(next.dummy.hp).toBe(1955)
 expect(next.dummy.effects).toContainEqual({kind:'blind',amount:20,turns:2})
})
it.each(companions)('gives $name exactly one damaging projectile skill and rejects removed skills',definition=>{
 const index=companions.indexOf(definition),{unit,battle}=ready(index)
 expect(definition.skills).toHaveLength(1)
 const skill=definition.skills[0]
 expect(skill.delivery).toBe('projectile');expect(skill.power).toBeGreaterThan(0)
 const next=practiceAction(battle,unit,skill.id,()=>.99)
 expect(next.dummy.hp).toBeLessThan(2000);expect(next.cue?.target).toBe('dummy')
 for(const removed of ['soft-breath','bronze-shell','blueback-assault','shimmer-cleanse'])expect(practiceAction(battle,unit,removed)).toBe(battle)
})
it('implements mitigation, penetration, vulnerability, shield break, execute and survival keywords',()=>{
 const {battle}=ready(),actor={...battle.player,stats:{...battle.player.stats,defense:100},effects:[{kind:'defense-up' as const,amount:50,turns:2},{kind:'corrosion' as const,amount:20,turns:2}]}
 expect(effectiveStat(actor,'defense')).toBe(120)
 expect(receiveDamage(actor,100,'physical').damage).toBe(45)
 expect(receiveDamage(actor,100,'physical',{penetration:100}).damage).toBe(100)
 const shield={...actor,shield:100,stats:{...actor.stats,defense:0},effects:[]}
 expect(receiveDamage(shield,30,'physical').damage).toBe(0)
 expect(receiveDamage(shield,30,'physical',{breakShield:true}).damage).toBe(30)
 expect(receiveDamage({...shield,hp:15,shield:0},1,'physical',{execute:10}).actor.hp).toBe(0)
 expect(receiveDamage({...shield,hp:1,shield:0,effects:[{kind:'revive',amount:20,turns:3}]},30,'physical').actor).toMatchObject({hp:20,effects:[]})
 expect(receiveDamage({...shield,hp:1,shield:0,effects:[{kind:'undying',amount:1,turns:1}]},30,'physical').actor.hp).toBe(1)
 expect(addStatus([{kind:'blind',amount:30,turns:1}],{kind:'blind',amount:20,turns:3})).toEqual([{kind:'blind',amount:30,turns:3}])
})
