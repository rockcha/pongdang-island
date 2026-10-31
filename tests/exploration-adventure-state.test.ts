import {expect,it} from 'vitest'
import {createRoomVisit,enterRoomVisit,restFully,sphinxPenalty,adventureRooms,sphinxQuestions} from '@/features/exploration/adventure-rooms'
import {drawRoomLoot,drawInvestigationLoot,lootDiscoveryText,receiveRoomLoot,sellRoomGear,gearSaleBlock,gearSalePrice} from '@/features/exploration/room-loot'
import {newPractice,grantPracticeSupplies,playerMaxHp} from '@/features/exploration/practice-state'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {drawMonster,regularMonsters} from '@/features/exploration/monster-catalog'
it('reserves both optional guardians for item-drop rooms and always prepares their loot',()=>{
 for(const id of ['ancient-giant','treasure-scarab'] as const){
  expect(regularMonsters.some(monster=>monster.id===id)).toBe(false)
  const state=startMonsterCombat(newPractice(()=>0),id,{ambush:true,random:()=>0})
  expect(state.combat?.loot).toBeTruthy()
  expect(state.combat?.lootClaimed).toBe(false)
  expect(state.combat?.ambush).toBe(true)
 }
 const state=startMonsterCombat({...newPractice(()=>0),mp:0,potions:{health:1,mana:0},hp:50},'ancient-giant')
 const result=resolveCombatTurn(state,{type:'potion',kind:'health'},()=>0)
 expect(result.events.some(event=>event.moveId==='earth-rumble'&&event.attackType==='magic')).toBe(true)
 expect(result.state.combat?.playerWeaken).toBe(2)
})
it('has three distinct rest and investigation scenes',()=>{
 for(const kind of ['rest','investigate']){const rooms=adventureRooms.filter(room=>room.kind===kind);expect(rooms).toHaveLength(3);expect(new Set(rooms.map(room=>room.background)).size).toBe(3)}
})
it('fully rests even through reduced healing and clamps curse and sphinx losses safely',()=>{
 const state={...newPractice(),hp:75,mp:25,playerEffects:[{kind:'burn' as const,amount:40,turns:2}]}
 expect(restFully(state)).toMatchObject({hp:100,mp:40})
 const visit=createRoomVisit('curse',state,'curse',()=>0),next=enterRoomVisit(state,visit)
 expect(next).toMatchObject({hp:45,mp:15});expect(enterRoomVisit(next,visit)).toBe(next)
 expect(sphinxPenalty(state).hp).toBe(38)
 const low={...state,hp:1,mp:0};expect(enterRoomVisit(low,createRoomVisit('curse',low)).hp).toBe(1);expect(sphinxPenalty(low).hp).toBe(1)
})
it('steals only one or two available bottles, including empty and one-bottle bags',()=>{
 for(const potions of [{health:0,mana:0},{health:1,mana:0},{health:0,mana:1},{health:3,mana:4}])for(const roll of [0,.99]){
  const state={...newPractice(),potions},visit=createRoomVisit('thief',state,'thief',()=>roll),next=enterRoomVisit(state,visit)
  expect(next.potions.health).toBeGreaterThanOrEqual(0);expect(next.potions.mana).toBeGreaterThanOrEqual(0)
  expect(visit.stolen.health+visit.stolen.mana).toBe(Math.min(potions.health+potions.mana,roll<.5?1:2))
  expect(enterRoomVisit(next,visit)).toBe(next)
 }
})
it.each(['chest','investigate-guards','investigate-wall','investigate-alchemy'] as const)('uses the 50/50 boundary once for %s',id=>{
 const state=newPractice()
 const at=(roll:number)=>{let draws=0;return createRoomVisit(id,state,id,()=>++draws===4?roll:0)}
 expect(at(.49999).outcome.kind).toBe(id==='chest'?'gold':'loot')
 expect(at(.5).outcome.kind).toBe('monster')
})
it('keeps bosses and the sleeping giant out of ordinary monster draws',()=>{
 for(let index=0;index<100;index++)expect(['obsidian-anubis','ancient-giant']).not.toContain(drawMonster(()=>(index+.5)/100).id)
 expect(regularMonsters).toHaveLength(9)
})
it('guarantees special drops, refuses boss escape and grants exactly one ambush',()=>{
 const state=grantPracticeSupplies(newPractice())
 const boss=startMonsterCombat(state,'obsidian-anubis',{random:()=>0});expect(boss.combat?.loot).toBeTruthy()
 expect(resolveCombatTurn(boss,{type:'flee'},()=>0).state).toBe(boss)
 const giant=startMonsterCombat(state,'ancient-giant',{ambush:true,random:()=>0}),first=resolveCombatTurn(giant,{type:'attack'},()=>.5)
 expect(giant.combat?.loot).toBeTruthy();expect(first.events[0].critical).toBe(true)
 expect(first.events.some(event=>event.kind==='monster')).toBe(false);expect(first.state.hp).toBe(state.hp)
 const second=resolveCombatTurn(first.state,{type:'attack'},()=>.5);expect(second.events[0].critical).toBe(false);expect(second.events.some(event=>event.kind==='monster')).toBe(true)
})
it('handles full bags, replacements, duplicate rejection and equipped sale protection',()=>{
 const state=grantPracticeSupplies(newPractice()),loot=drawRoomLoot(state,'starter',()=>0)
 expect(loot.kind).toBe('weapon');expect(receiveRoomLoot(state,loot)).toBe(state)
 const next=receiveRoomLoot(state,loot,state.weaponId);expect(next.weapons).toHaveLength(3);expect(next.weaponId).toBe(loot.id)
 const duplicate=receiveRoomLoot(next,loot);expect(duplicate).toBe(next)
 expect(gearSaleBlock(state,'weapon',state.weaponId)).toBeTruthy();expect(sellRoomGear(state,'weapon',state.weaponId)).toBe(state)
 const gear=state.weapons[1],sold=sellRoomGear(state,'weapon',gear.id);expect(sold.weapons).toHaveLength(2);expect(sold.gold).toBe(state.gold+gearSalePrice(gear))
 expect(gearSaleBlock(newPractice(),'weapon',newPractice().weaponId)).toBeTruthy()
 expect(playerMaxHp(next)).toBe(100)
})

it('keeps the first giant counter blocked when the ambush starts with a spell',()=>{
 const supplied=grantPracticeSupplies(newPractice())
 const state=startMonsterCombat({...supplied,hp:50,equippedSpells:['light']},'ancient-giant',{ambush:true,random:()=>0})
 const result=resolveCombatTurn(state,{type:'magic',id:'light'},()=>.5)
 expect(result.state.hp).toBe(68);expect(result.events.some(event=>event.kind==='monster')).toBe(false)
})

it.each(['investigate-guards','investigate-wall','investigate-alchemy'] as const)('reserves a guaranteed equipment reward behind the monster in %s',id=>{
 const state=newPractice(()=>0)
 for(const rewardRoll of [0,.59999]){
  let draws=0
  const visit=createRoomVisit(id,state,id,()=>{draws++;return draws===4?.5:draws===6?rewardRoll:0})
  expect(visit.outcome.kind).toBe('monster')
  if(visit.outcome.kind!=='monster')throw Error('Expected monster')
  expect(visit.outcome.loot?.kind).toBe(rewardRoll===0?'weapon':'armor')
  const fighting=startMonsterCombat(state,visit.outcome.monsterId,{loot:visit.outcome.loot})
  expect(fighting.combat?.loot).toEqual(visit.outcome.loot)
  const won=resolveCombatTurn({...fighting,combat:{...fighting.combat!,enemyHp:1}},{type:'attack'},()=>.5)
  expect(won.state.combat?.status).toBe('won')
  expect(won.state.combat?.loot).toEqual(visit.outcome.loot)
  expect(won.lines.some(line=>line.includes('처치했습니다.'))).toBe(true)
 }
 let draws=0
 const chest=createRoomVisit('chest',state,'chest',()=>++draws===4?.5:0)
 expect(chest.outcome.kind==='monster'&&chest.outcome.loot).toBeUndefined()
})

it('draws investigation equipment and single potions at the intended boundaries',()=>{
 const state=newPractice(()=>0)
 for(const roll of [0,.59999])expect(['weapon','armor']).toContain(drawInvestigationLoot(state,'starter',()=>roll).kind)
 for(const [roll,kind] of [[.6,'health'],[.79999,'health'],[.8,'mana'],[.99999,'mana']] as const){
  const loot=drawInvestigationLoot(state,'starter',()=>roll)
  expect(loot).toMatchObject({kind:'potion',potionKind:kind})
  const next=receiveRoomLoot(state,loot)
  expect(next.potions[kind]).toBe(state.potions[kind]+1)
  expect(next.potions[kind==='health'?'mana':'health']).toBe(state.potions[kind==='health'?'mana':'health'])
 }
 const lootTypes=[0,.59999,.6,.8].map(roll=>drawInvestigationLoot(state,'starter',()=>roll))
 expect(new Set(lootTypes.map(loot=>lootDiscoveryText(loot,()=>0))).size).toBe(4)
 for(const loot of lootTypes)expect(lootDiscoveryText(loot,()=>0)).toContain(loot.name)
})

it('draws every one of the twenty distinct sphinx riddles with a valid unique answer',()=>{
 expect(sphinxQuestions).toHaveLength(20)
 expect(new Set(sphinxQuestions.map(item=>item.question)).size).toBe(20)
 const state=newPractice(()=>0),drawn=new Set<string>()
 for(let index=0;index<20;index++){
  const visit=createRoomVisit('sphinx',state,'quiz',()=>(index+.5)/20)
  expect(visit.question).toBe(sphinxQuestions[index])
  expect(visit.question.answers).toHaveLength(3)
  expect(new Set(visit.question.answers).size).toBe(3)
  expect(visit.question.answers[visit.question.correct]).toBeTruthy()
  drawn.add(visit.question.question)
 }
 expect(drawn.size).toBe(20)
})

it('draws ten warning inscriptions without applying any gameplay effect',()=>{
 const state={...newPractice(()=>0),hp:64,mp:17},texts=new Set<string>()
 for(let index=0;index<10;index++){
  const visit=createRoomVisit('warning-wall',state,'lore-'+index,()=>(index+.5)/10)
  expect(visit.outcome.kind).toBe('none')
  expect(enterRoomVisit(state,visit)).toEqual({...state,roomVisitKey:visit.key})
  texts.add(visit.progress)
 }
 expect(texts.size).toBe(10)
})
