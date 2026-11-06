import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {buyFarmItem} from '@/features/farm/farm-stock'
import {resellStoredFarmItem} from '@/features/farm/resale'

it('can buy an additional kitchen for 2500 and resells at half the new price',()=>{
 const state={...initialTopview(),gold:2500}
 const bought=buyFarmItem(state,'kitchen',1)
 expect(bought.gold).toBe(0)
 expect(bought.stored).toContain('kitchen')
 expect(bought.objects.some(o=>o.kind==='kitchen')).toBe(true)
 expect(buyFarmItem(bought,'kitchen',1)).toBe(bought)
 const sold=resellStoredFarmItem(bought,'kitchen').state
 expect(sold.gold).toBe(1250)
 expect(sold.stored).not.toContain('kitchen')
})
