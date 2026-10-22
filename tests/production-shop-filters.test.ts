import {expect,it} from 'vitest'
import {filterProductionShop,initialShopFilters,type ShopFilters} from '@/features/production/shop-filters'
import catalog from '../supabase/catalog/catalog.json'
import type {ProductionFacility} from '@/features/production/api'
const sites:ProductionFacility[]=[
 {...catalog.production_facilities[0],id:'a',kind:'trash',name:'작은 화덕',input_count:16,output_count:1,production_minutes:30,storage_minutes:900,price:800,owned:false,startedAt:null,completesAt:null,expiresAt:null,runOutput:null},
 {...catalog.production_facilities[0],id:'b',kind:'trash',name:'소라 공방',input_count:4,output_count:5,production_minutes:390,storage_minutes:120,price:1500,owned:false,startedAt:null,completesAt:null,expiresAt:null,runOutput:null},
 {...catalog.production_facilities[0],id:'c',kind:'trash',name:'파도 Press',input_count:7,output_count:2,production_minutes:90,storage_minutes:90,price:2000,owned:false,startedAt:null,completesAt:null,expiresAt:null,runOutput:null},
]
const ids=(f:Partial<ShopFilters>)=>filterProductionShop(sites,{...initialShopFilters,...f}).map(s=>s.id)
it('searches names without case or surrounding whitespace and reports an empty result',()=>{
 expect(ids({search:'  PRESS '})).toEqual(['c']);expect(ids({search:'소라'})).toEqual(['b']);expect(ids({search:'없는 시설'})).toEqual([])
})
it.each([
 ['input_count','b,c,a'],['output_count','b,c,a'],['production_minutes','a,c,b'],['storage_minutes','a,b,c'],['price','a,b,c'],
] as const)('sorts %s in its chosen direction without changing the input', (sort,order)=>{
 expect(ids({sort})).toEqual(order.split(','));expect(sites.map(s=>s.id)).toEqual(['a','b','c'])
})
