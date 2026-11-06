import {expect,it} from 'vitest'
import {canUseFarmTrialStock,initialFarmTrial} from '@/features/farm/trial-inventory'
import {cropKinds} from '@/features/farm/crop-catalog'
import {finishedFoods} from '@/features/farm/food-catalog'
import {farmStorageUsage} from '@/features/farm/farm-simulation'
import {warehouseCapacity} from '@/features/farm/building-upgrades'
it('only enables sample stock for the designated operator',()=>{
 expect(canUseFarmTrialStock(true,'0@0.com')).toBe(true)
 expect(canUseFarmTrialStock(false,'0@0.com')).toBe(false)
 expect(canUseFarmTrialStock(true,'other@example.com')).toBe(false)
 expect(canUseFarmTrialStock(true)).toBe(false)
 expect(initialFarmTrial().simulation.inventory.honeyCake).toBe(0)
})
it('provides crops and completed foods with spare storage and fresh reset state',()=>{
 const state=initialFarmTrial(true)
 for(const good of [...cropKinds,...finishedFoods])expect(state.simulation.inventory[good]).toBeGreaterThanOrEqual(2)
 expect(state.simulation.inventory.wheat).toBe(12)
 expect(state.simulation.inventory.honey).toBe(0)
 expect(warehouseCapacity(state)-farmStorageUsage(state.simulation)).toBeGreaterThanOrEqual(30)
 state.simulation.inventory.honeyCake=0
 expect(initialFarmTrial(true).simulation.inventory.honeyCake).toBe(2)
})
