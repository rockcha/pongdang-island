import {LayoutGrid,Sprout,Beef,Factory,ChefHat,Flower2,Fence,Rabbit,Waves,Shirt} from 'lucide-react'
import type {ShopCategory} from './shop-categories'

const icons={전체:LayoutGrid,농업:Sprout,축산:Beef,가공:Factory,요리:ChefHat,생활용품:Shirt,자연:Flower2,'울타리·시설':Fence,캐릭터:Rabbit,'물 위 장식':Waves}
export function ShopCategoryIcon({category}:{category:ShopCategory}){
 if(category==='다리')return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 18V8m18 10V8M3 12h18M3 16h18M7 12v4m5-4v4m5-4v4M1 20h4m14 0h4"/></svg>
 const Icon=icons[category]
 return <Icon size={20} strokeWidth={1.6} aria-hidden="true"/>
}
