import {expect,it} from 'vitest'
import {filterBaitProductionShop,initialBaitShopFilters,type BaitShopFilters} from '@/features/production/bait-shop-filters'
import type {BaitFacility} from '@/features/production/bait-production-api'
const common={description:'',bait_id:'bait',image_path:'',ownedCount:0,startedAt:null,completesAt:null,expiresAt:null,runOutput:null}
const sites:BaitFacility[]=[
 {...common,id:'a',name:'흙상자',baitName:'지렁이',price:300,fuel_cost:1,output_count:2,production_minutes:30,storage_minutes:30},
 {...common,id:'b',name:'달빛 공방',baitName:'Moon shrimp',price:600,fuel_cost:3,output_count:8,production_minutes:15,storage_minutes:60},
 {...common,id:'c',name:'소라 공방',baitName:'조개',price:400,fuel_cost:2,output_count:4,production_minutes:45,storage_minutes:90},
]
const ids=(f:Partial<BaitShopFilters>)=>filterBaitProductionShop(sites,{...initialBaitShopFilters,...f}).map(s=>s.id)
it('searches both facility and bait names without case or surrounding whitespace',()=>{
 expect(ids({search:'  MOON '})).toEqual(['b']);expect(ids({search:'조개'})).toEqual(['c']);expect(ids({search:'공방'})).toEqual(['c','b']);expect(ids({search:'없음'})).toEqual([])
})
it.each([['price','a,c,b'],['fuel_cost','a,c,b'],['output_count','b,c,a'],['production_minutes','b,a,c'],['storage_minutes','c,b,a']] as const)('sorts by %s without changing the source', (sort,order)=>{
 expect(ids({sort})).toEqual(order.split(','));expect(sites.map(s=>s.id)).toEqual(['a','b','c'])
})
