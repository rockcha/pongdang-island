import {expect,it} from 'vitest'
import {merchantDeliveryPlan} from '@/features/merchant/delivery-plan'
import type {MerchantOrder} from '@/features/merchant/api'
const order=(number:number,quantity:number):MerchantOrder=>({id:String(number),number,tier:'small',regionName:null,items:[{speciesId:'fish',name:'물고기',thumbnailPath:'fish.png',kind:'fish',rarity:'common',quantity,owned:5,unitGold:10}],baseGold:10,rewardGold:20,completed:false,mine:false})
it('reserves shared stock once in order-number order and skips unaffordable or completed orders',()=>{
 expect(merchantDeliveryPlan([order(3,2),order(2,3),order(1,3),{...order(0,1),completed:true}]).map(o=>o.id)).toEqual(['1','3'])
})
