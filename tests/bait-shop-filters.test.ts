import {expect,it} from 'vitest'
import type {FishingBait} from '@/features/fishing/api'
import {filterBaitShop,initialBaitShopFilter} from '@/features/fishing/bait-shop-filters'

const base:FishingBait={id:'bait',name:'Wave 미끼',description:'달콤한 향기',price:10,effect_kind:'fish',effect_description:'',image_path:'',common_bp:10000,rare_bp:0,epic_bp:0,mythic_bp:0,failure_bp:0}
it('includes mixed targets and the shooting star special without changing catalog order',()=>{
 const items=[{...base,id:'bait_shooting_star_tail'},base,{...base,id:'bait_magnet',effect_kind:'decoration' as const}]
 expect(filterBaitShop(items,{...initialBaitShopFilter,target:'decoration'}).map(item=>item.id)).toEqual(['bait_shooting_star_tail','bait','bait_magnet'])
 expect(filterBaitShop(items,{...initialBaitShopFilter,target:'trash'}).map(item=>item.id)).toEqual(['bait_shooting_star_tail','bait'])
 expect(items.map(item=>item.id)).toEqual(['bait_shooting_star_tail','bait','bait_magnet'])
})
it('searches names and descriptions without distinguishing daytime and nighttime waits',()=>{
 const items=[base,{...base,id:'bait_moonshade_dumpling',period:'night' as const},{...base,id:'bait_moonshade_dumpling',period:'day' as const}]
 expect(filterBaitShop(items,{...initialBaitShopFilter,search:'  WAVE '})).toEqual(items)
 expect(filterBaitShop(items,{...initialBaitShopFilter,search:'달콤한'})).toEqual(items)
})
