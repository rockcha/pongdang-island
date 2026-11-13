// @vitest-environment node
import {expect,it} from 'vitest'
import {BUILDINGS,TOWER_KINDS,createDefense,beginDefense,build,upgrade,specialize,specializationCost,specializationOptions,targetLayerOf,cellAt,SITES,startWave,spawnEnemy,stepDefense,sell,type TowerKind,type EnemyKind} from '@/features/arcade/tower-defense-engine'
const eligible=TOWER_KINDS.filter(kind=>BUILDINGS[kind].targetLayer!=='both')
function arena(kind:TowerKind,hybrid=false){
 const s=createDefense(42);beginDefense(s);s.gold=10000
 const cell=cellAt(6,8);build(s,cell,kind);for(let i=0;i<3;i++)upgrade(s,cell)
 s.wave=30;if(hybrid)expect(specialize(s,cell,'hybrid')).toBe(true)
 startWave(s);s.spawned=s.plan.length
 return s
}
function spawn(s:ReturnType<typeof arena>,kind:EnemyKind){
 spawnEnemy(s,kind,cellAt(6,7));const e=s.enemies.at(-1)!,p=SITES[cellAt(6,8)]
 Object.assign(e,{x:p.x,y:p.y-24,px:p.x,py:p.y-24,speed:0,hp:100000,maxHp:100000,shield:0,shieldMax:0})
 return e
}
function ticks(s:ReturnType<typeof arena>,n=200){for(let i=0;i<n;i++)stepDefense(s,.05)}
function loss(kind:TowerKind,hybrid:boolean,air:boolean){
 const s=arena(kind,hybrid),e=spawn(s,air?'cuttlefish':'armored');ticks(s);return 100000-e.hp
}
it.each(eligible)('%s keeps native damage, unlocks the other layer, and deals 80 percent cross-layer damage',kind=>{
 const nativeAir=BUILDINGS[kind].targetLayer==='air'
 const native=loss(kind,false,nativeAir)
 expect(native).toBeGreaterThan(0)
 expect(loss(kind,false,!nativeAir)).toBe(0)
 expect(loss(kind,true,nativeAir)).toBeCloseTo(native,4)
 expect(loss(kind,true,!nativeAir)).toBeCloseTo(native*.8,4)
})
it('quotes the hybrid surcharge, charges once, and rejects hybrid on naturally dual-purpose towers',()=>{
 const s=arena('missile'),b=s.buildings[0],before=s.gold,cost=specializationCost(b,'hybrid')
 expect(specialize(s,b.cell,'hybrid')).toBe(true)
 expect(s.gold).toBe(before-cost);expect(targetLayerOf(b)).toBe('both')
 expect(specialize(s,b.cell,'power')).toBe(false)
 expect(specializationOptions('sniper')).not.toContain('hybrid');expect(specializationOptions('harpoon')).not.toContain('hybrid')
 const dual=arena('sniper');expect(specialize(dual,dual.buildings[0].cell,'hybrid')).toBe(false)
})
it('keeps mixed-layer splash after sale and clears projectile specialization when the pool is reused',()=>{
 const s=arena('mortar',true),ground=spawn(s,'armored'),air=spawn(s,'cuttlefish'),cell=s.buildings[0].cell
 ticks(s,1);expect(s.projectiles).toHaveLength(1);expect(sell(s,cell)).toBe(true)
 ticks(s,11);expect(ground.hp).toBeLessThan(100000);expect(air.hp).toBeLessThan(100000)
 ground.hp=air.hp=100000
 expect(build(s,cell,'mortar')).toBe(true);ticks(s,20)
 expect(ground.hp).toBeLessThan(100000);expect(air.hp).toBe(100000)
})
it('applies reduced airborne slow and the existing boss slow reduction without stacking',()=>{
 const s=arena('frost',true),normal=spawn(s,'cuttlefish'),boss=spawn(s,'eclipseDragon')
 ticks(s,1)
 expect(normal.slowFactor).toBeCloseTo(.6)
 expect(boss.slowFactor).toBeCloseTo(.8)
 ticks(s,20);expect(normal.slowFactor).toBeCloseTo(.6);expect(boss.slowFactor).toBeCloseTo(.8)
})
