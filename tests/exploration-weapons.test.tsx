// Pin attack variation to its midpoint for these status, armor and presentation fixtures.
// Real random damage is covered in exploration-attack-roll.test.ts.
vi.mock('@/features/exploration/attack-roll',async importOriginal=>({...await importOriginal<typeof import('@/features/exploration/attack-roll')>(),rollBasicAttack:(attack:number)=>Math.max(1,attack)}))
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {explorationWeapons,starterWeapons,hasWeaponEffect} from '@/features/exploration/weapon-catalog'
import {buyMerchantItem,equipGear,newPractice,purchaseBlock} from '@/features/exploration/practice-state'
import {resolveCombatTurn,startScorpionCombat} from '@/features/exploration/combat-state'
import {applyEnemyAilment,enemyHealingAmount} from '@/features/exploration/status-effects'
import {ExplorationCodex} from '@/features/exploration/codex'
afterEach(cleanup)
const rolls=(...values:number[])=>()=>values.shift()??.99
function stocked(id:string){const state=newPractice();return {...state,market:{...state.market,weaponIds:[id]}}}
function armed(id:string){return startScorpionCombat(equipGear(buyMerchantItem(stocked(id),id),'weapon',id))}

it('ships matching original artwork, prompts and transparent runtime images for every catalog weapon',()=>{
 const manifest=JSON.parse(readFileSync('assets/exploration/weapons/manifest.json','utf8')) as {images:Array<{id:string;source:string;output:string;prompt:string}>}
 expect(manifest.images.map(image=>image.id).sort()).toEqual(explorationWeapons.map(weapon=>weapon.id).sort())
 for(const weapon of explorationWeapons){
  const image=manifest.images.find(item=>item.id===weapon.id)!
  expect(existsSync(image.source)).toBe(true)
  expect(image.prompt.toLowerCase()).toContain('transparent')
  expect(image.output).toBe('public'+weapon.image)
  const bytes=readFileSync(image.output)
  expect(bytes.readUInt32BE(16)).toBe(512);expect(bytes.readUInt32BE(20)).toBe(512)
  expect([4,6]).toContain(bytes[25])
 }
})

it('sells all ten weapons with exact catalog stats and prevents duplicate or over-capacity purchases',()=>{
 expect(starterWeapons).toHaveLength(10)
 for(const weapon of starterWeapons){
  const initial=stocked(weapon.id),bought=buyMerchantItem(initial,weapon.id)
  expect(bought.gold).toBe(initial.gold-weapon.price)
  expect(bought.weapons.find(item=>item.id===weapon.id)).toEqual(weapon)
  expect(purchaseBlock(bought,weapon.id)).toBe('판매하지 않는 물품이에요.')
 }
 const stock=newPractice(()=>0)
 const full=explorationWeapons.slice(0,2).reduce((state,weapon)=>buyMerchantItem(state,weapon.id),stock)
 expect(full.weapons).toHaveLength(3)
 expect(buyMerchantItem({...full,gold:9999},explorationWeapons[2].id).weapons).toHaveLength(3)
})
it('shows artwork and filters tier and weapon effect independently',()=>{
 render(<ExplorationCodex ownedIds={['tomb-bronze-sword']}/>);fireEvent.click(screen.getByRole('button',{name:'도감'}))
 expect(screen.getAllByRole('img')).toHaveLength(45)
 fireEvent.click(screen.getByRole('button',{name:'기본형'}))
 expect(screen.getAllByRole('img')).toHaveLength(24)
 fireEvent.click(screen.getByRole('button',{name:'상태이상',exact:true}))
 expect(screen.getAllByRole('img')).toHaveLength(15)
 fireEvent.click(screen.getByRole('button',{name:'중급 14'}))
 expect(screen.getAllByRole('img')).toHaveLength(5)
 fireEvent.click(screen.getByRole('button',{name:'기본형'}))
 expect(screen.getAllByRole('img')).toHaveLength(6)
 expect(screen.getByRole('heading',{name:'사막강철 장검'})).toBeTruthy()
 expect(screen.getByRole('heading',{name:'사막의 전투도끼'})).toBeTruthy()
 expect(screen.getByRole('heading',{name:'청동 전투망치'})).toBeTruthy()
 expect(screen.getByRole('heading',{name:'유적 사냥꾼의 쇠뇌'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'고급 9'}))
 expect(screen.getAllByRole('img')).toHaveLength(3)
 expect(screen.getByRole('heading',{name:'왕의 정오 대검'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'일반 22'}))
 expect(screen.getAllByRole('img')).toHaveLength(15)
 expect(screen.getByRole('heading',{name:'작은 곡괭이'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'모든 단계 45'}))
 fireEvent.click(screen.getByRole('button',{name:'피흡·정화'}))
 expect(screen.getAllByRole('img')).toHaveLength(6)
 expect(screen.getByRole('heading',{name:'새벽의 정화봉'})).toBeTruthy()
})
it('registers ten ordinary starter tools without procs and sells them when stocked',()=>{
 const tools=explorationWeapons.filter(weapon=>weapon.tier==='starter'&&!starterWeapons.some(item=>item.id===weapon.id)&&!hasWeaponEffect(weapon))
 expect(tools.map(weapon=>weapon.name)).toEqual(['작은 곡괭이','벌목용 손도끼','낡은 작살','철제 삽','튼튼한 몽둥이','돌망치','잘 드는 부엌칼','녹슨 쇠지렛대','부러진 노','낚시용 갈고리'])
 for(const weapon of tools){
  expect(weapon.proc).toBeUndefined()
  expect(weapon.attack).toBeGreaterThan(newPractice().weapons[0].attack!)
  const state=stocked(weapon.id)
  expect(buyMerchantItem(state,weapon.id).weapons).toContain(weapon)
 }
})
it('keeps advanced and ultimate plain weapons balanced and requires a floor offering to buy them',()=>{
 expect(explorationWeapons).toHaveLength(45)
 expect(new Set(explorationWeapons.map(weapon=>weapon.id)).size).toBe(45)
 for(const tier of ['advanced','ultimate'] as const){
  const weapons=explorationWeapons.filter(weapon=>weapon.tier===tier)
  expect(weapons).toHaveLength(tier==='advanced'?14:9)
  const plain=weapons.filter(weapon=>!hasWeaponEffect(weapon))
  expect(plain).toHaveLength(tier==='advanced'?6:3)
  const damage=plain.map(weapon=>weapon.attack*(1+weapon.critical/100))
  expect(Math.max(...damage)-Math.min(...damage)).toBeLessThan(.2)
  for(const weapon of weapons){
   expect(weapon.price).toBeGreaterThan(0)
   const state=newPractice(()=>.99)
   expect(buyMerchantItem(state,weapon.id)).toBe(state)
   expect(purchaseBlock(state,weapon.id)).toBe('판매하지 않는 물품이에요.')
  }
 }
})
it('keeps clear damage steps between tiers and scales status effects without extending freeze locks',()=>{
 const tiers=(['starter','advanced','ultimate'] as const).map(tier=>explorationWeapons.filter(weapon=>weapon.tier===tier&&!weapon.lifesteal&&!weapon.cleanseChance))
 const expected=(weapon:typeof explorationWeapons[number])=>weapon.attack*(1+weapon.critical/100)
 // Premium ordinary weapons bridge the normal tier gap while retaining the ordinary label.
 const ordinary=tiers[0].filter(weapon=>weapon.price<=380),premium=tiers[0].filter(weapon=>weapon.price>380)
 const starterMax=Math.max(...ordinary.map(expected)),advancedMin=Math.min(...tiers[1].map(expected)),advancedMax=Math.max(...tiers[1].map(expected)),ultimateMin=Math.min(...tiers[2].map(expected))
 expect(premium).toHaveLength(2)
 for(const weapon of premium){
  expect(expected(weapon)).toBeGreaterThan(starterMax)
  expect(expected(weapon)).toBeLessThan(advancedMin)
  expect(weapon.price).toBeLessThan(Math.min(...tiers[1].map(item=>item.price)))
  expect(weapon.attackVariance??0).toBe(0)
  expect(hasWeaponEffect(weapon)).toBe(false)
 }
 expect(advancedMin).toBeGreaterThanOrEqual(starterMax*1.35)
 expect(advancedMax).toBeLessThan(starterMax*1.6)
 expect(ultimateMin).toBeGreaterThanOrEqual(advancedMax*1.2)
 for(const kind of ['bleed','freeze','burn','weaken','blind'] as const){
  const procs=tiers.map(weapons=>weapons.find(weapon=>weapon.proc?.kind===kind)!.proc!)
  expect(procs[1].chance).toBeGreaterThan(procs[0].chance)
  expect(procs[2].chance).toBeGreaterThan(procs[1].chance)
  for(let i=1;i<procs.length;i++){
   expect(procs[i].amount).toBeGreaterThanOrEqual(procs[i-1].amount)
   expect(procs[i].turns).toBeGreaterThanOrEqual(procs[i-1].turns)
  }
  if(kind==='freeze')expect(procs.map(proc=>proc.turns)).toEqual([1,1,1])
 }
})
it('gives plain ultimates a clear damage premium while preserving the approved status and lifesteal options',()=>{
 const ultimate=explorationWeapons.filter(weapon=>weapon.tier==='ultimate')
 const direct=(weapon:typeof ultimate[number])=>weapon.attack*(1+weapon.critical/100)
 const plain=ultimate.filter(weapon=>!hasWeaponEffect(weapon))
 for(const weapon of plain){
  expect(direct(weapon)).toBeGreaterThanOrEqual(33)
  expect(direct(weapon)).toBeLessThan(33.1)
  expect(direct(weapon)).toBeGreaterThan(Math.max(...ultimate.filter(item=>item.proc).map(direct))*1.05)
 }
 const preserved=[['anubis-crimson-judgment',25,18],['eternal-winter-kingspear',25,12],['ra-twilight-scimitar',26,16],['fallen-dynasty-maul',25,14],['set-hidden-fang',24,25],['osiris-lifereaper',24,8]] as const
 for(const [id,attack,critical] of preserved)expect(ultimate.find(weapon=>weapon.id===id)).toMatchObject({attack,critical})
 expect(ultimate.find(weapon=>weapon.id==='osiris-lifereaper')?.lifesteal).toBe(25)
})
it('bleeds twice, expires and preserves the player animation snapshot',()=>{
 const initial=armed('serrated-bronze-sword'),first=resolveCombatTurn(initial,{type:'attack'},rolls(.99,0,.99))
 expect(first.playerState.combat?.enemyHp).toBe(26)
 expect(first.playerState.combat?.effects).toEqual([{kind:'bleed',amount:2,turns:2}])
 expect(first.state.combat?.enemyHp).toBe(24)
 expect(first.state.combat?.effects?.[0].turns).toBe(1)
 const second=resolveCombatTurn(first.state,{type:'attack'},()=>.99)
 expect(second.state.combat?.enemyHp).toBe(10)
 expect(second.state.combat?.effects).toEqual([])
 expect(initial.combat?.enemyHp).toBe(38)
})
it('allows one enemy action between freezes and prevents permanent freeze',()=>{
 const first=resolveCombatTurn(armed('frost-tip-spear'),{type:'attack'},rolls(.99,0)).state
 expect(first.hp).toBe(100);expect(first.combat?.freezeGuard).toBe(true)
 const second=resolveCombatTurn(first,{type:'attack'},()=>.99).state
 expect(second.hp).toBe(94);expect(second.combat?.freezeGuard).toBe(false)
 const third=resolveCombatTurn(second,{type:'attack'},rolls(.99,0)).state
 expect(third.hp).toBe(94);expect(third.combat?.freezeGuard).toBe(true)
})
it('applies weakness and checks blindness before armor evasion',()=>{
 const weak=resolveCombatTurn(armed('sandstone-maul'),{type:'attack'},rolls(.99,0,.99))
 expect(weak.state.hp).toBe(96)
 const blind=resolveCombatTurn(armed('sandwind-dagger'),{type:'attack'},rolls(.99,0,0))
 expect(blind.state.hp).toBe(100)
 expect(blind.events.some(event=>event.effect==='miss')).toBe(true)
})
it('burn reduces healing without damage; stronger effects win without stacking',()=>{
 const burn=resolveCombatTurn(armed('ember-scimitar'),{type:'attack'},rolls(.99,0,.99))
 expect(burn.state.combat?.enemyHp).toBe(25)
 expect(enemyHealingAmount(20,burn.state.combat?.effects??[])).toBe(12)
 expect(burn.state.combat?.effects?.[0]).toEqual({kind:'burn',amount:40,turns:2})
 const strong=[{kind:'weaken' as const,amount:4,turns:1}]
 expect(applyEnemyAilment(strong,{kind:'weaken',amount:2,turns:4})).toBe(strong)
 expect(applyEnemyAilment(strong,{kind:'weaken',amount:4,turns:3})).toEqual([{kind:'weaken',amount:4,turns:3}])
})
it('awards a bleed kill once and does not tick statuses after a successful escape',()=>{
 const initial=armed('serrated-bronze-sword')
 initial.combat!.enemyHp=14
 const kill=resolveCombatTurn(initial,{type:'attack'},rolls(.99,0,.99)).state
 expect(kill.combat?.status).toBe('won');expect(kill.gold).toBe(initial.gold+120)
 expect(resolveCombatTurn(kill,{type:'attack'}).state).toBe(kill)
 const flee=armed('serrated-bronze-sword');flee.combat!.effects=[{kind:'bleed',amount:50,turns:2}]
 const escaped=resolveCombatTurn(flee,{type:'flee'},()=>0).state
 expect(escaped.combat?.status).toBe('escaped');expect(escaped.combat?.enemyHp).toBe(38);expect(escaped.gold).toBe(flee.gold)
})
