import {farmDuration} from './farm-duration'
import {FarmGold} from './farm-gold'
import {Clock3} from 'lucide-react'
import {FarmGoodIcon} from './farm-good-icon'
import {farmGoods,type FarmGood} from './farm-simulation'
import {isDeliverableGood} from './food-catalog'

export function FarmProductHeading({good,seconds}:{good:FarmGood;seconds:number}){
 const item=farmGoods[good]
 return <header className="farm-production-heading"><FarmGoodIcon good={good}/><div><h3>{item.name}</h3><p>{isDeliverableGood(good)?<>판매가 <FarmGold amount={item.price}/></>:'제작 재료'}</p></div><span><Clock3 size={14}/>{farmDuration(seconds)}</span></header>
}
