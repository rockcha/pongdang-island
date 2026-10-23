import type {BaitFacility} from './bait-production-api'
import {ShopSearchAndSort} from './shop-filters'

export const baitShopSortOptions=[
 {key:'output_count',label:'생산량 많은 순',direction:-1},
 {key:'fuel_cost',label:'연료 소모량 적은 순',direction:1},
 {key:'production_minutes',label:'시간 짧은 순',direction:1},
 {key:'storage_minutes',label:'보관 기간 긴 순',direction:-1},
 {key:'price',label:'가격 싼 순',direction:1},
] as const
export type BaitShopFilters={search:string;sort:typeof baitShopSortOptions[number]['key']}
export const initialBaitShopFilters:BaitShopFilters={search:'',sort:'price'}
export function filterBaitProductionShop(sites:BaitFacility[],filter:BaitShopFilters){
 const search=filter.search.trim().toLocaleLowerCase(),direction=baitShopSortOptions.find(o=>o.key===filter.sort)!.direction
 return sites.filter(s=>`${s.name} ${s.baitName}`.toLocaleLowerCase().includes(search)).sort((a,b)=>(a[filter.sort]-b[filter.sort])*direction||a.id.localeCompare(b.id))
}
export function BaitProductionShopFilters({value,onChange}:{value:BaitShopFilters;onChange:(value:BaitShopFilters)=>void}){
 return <ShopSearchAndSort value={value} onChange={onChange} options={baitShopSortOptions.map(({key,label})=>({value:key,label}))} searchLabel="미끼 생산소 검색" placeholder="생산소 또는 미끼 검색"/>
}
