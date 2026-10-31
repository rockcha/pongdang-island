import {expect,it} from 'vitest'
import {newPractice} from '@/features/exploration/practice-state'
import {queueForcedMerchant,finishForcedMerchant} from '@/features/exploration/merchant-pity'
import {beginForcedMerchant,enterShopkeeper} from '@/features/exploration/shop-state'
import {getShopkeeper} from '@/features/exploration/shopkeepers'
import {advanceExploration} from '@/features/exploration/run-state'
import {canUseTeleport,drawPracticeFloor} from '@/features/exploration/campaign'
it('guarantees actual equipment-shop access after a missed interval, before the same floor doors',()=>{
 const initial=newPractice(()=>0,'practice'),at10={...initial,market:drawPracticeFloor(10,()=>0)}
 const at11=advanceExploration(at10,()=>0)
 expect(at11.forcedMerchant).toEqual({floor:11,id:'hasan',phase:'pending'})
 expect(advanceExploration(at11)).toBe(at11)
 const active=beginForcedMerchant(at11,()=>0)
 expect(active.equipmentMerchantVisits).toEqual([11]);expect(active.forcedMerchant?.phase).toBe('active')
 expect(active.market.doors).toEqual(at11.market.doors);expect(active.market.weaponIds).toHaveLength(3)
 expect(beginForcedMerchant(active)).toBe(active)
 const finished=finishForcedMerchant(active)
 expect(finished.market.floor).toBe(11);expect(finished.forcedMerchant).toBeUndefined()
 expect(queueForcedMerchant(finished)).toBe(finished)
 expect(advanceExploration(finished,()=>0).market.floor).toBe(12)
})
it('counts real equipment visits, ignores mere door generation and magic-only visits',()=>{
 const fresh=newPractice(()=>0,'practice'),at5={...fresh,market:drawPracticeFloor(5,()=>0)}
 const equipment=enterShopkeeper(at5,getShopkeeper('hasan'),()=>0)
 const at11={...equipment,market:drawPracticeFloor(11,()=>0)}
 expect(queueForcedMerchant(at11).forcedMerchant).toBeUndefined()
 const magic=enterShopkeeper(at5,getShopkeeper('nadim'),()=>0)
 expect(queueForcedMerchant({...magic,market:at11.market}).forcedMerchant?.id).toBe('hasan')
 expect(enterShopkeeper(equipment,getShopkeeper('hasan'),()=>0).equipmentMerchantVisits).toEqual([5])
})
it('uses the appropriate supply tier, runs only once per checkpoint and never in free test mode',()=>{
 for(const [floor,id]of [[11,'hasan'],[21,'karim'],[31,'karim'],[41,'zahir']] as const){
  const state={...newPractice(()=>0,'practice'),market:drawPracticeFloor(floor,()=>0)}
  const queued=queueForcedMerchant(state);expect(queued.forcedMerchant?.id).toBe(id)
  expect(queueForcedMerchant(queued)).toBe(queued)
  expect(queueForcedMerchant({...state,supplyChecks:[floor]}).forcedMerchant).toBeUndefined()
  for(const source of [floor-2,floor-1])expect(canUseTeleport(source)).toBe(false)
 }
 const free={...newPractice(()=>0),market:drawPracticeFloor(11,()=>0)}
 expect(queueForcedMerchant(free)).toBe(free)
})
