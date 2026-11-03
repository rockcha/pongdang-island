import {cropArt} from './crop-catalog'
import {farmGoods,type FarmGood} from './farm-simulation'

export function FarmGoodIcon({good,className=''}:{good:FarmGood;className?:string}){
 const item=farmGoods[good]
 return <span className={`farm-good-icon ${good.endsWith('Seed')?'farm-good-seed':''} ${className}`} aria-hidden="true">
  <img src={item.crop?cropArt(item.crop):item.image} alt="" draggable={false}/>
 </span>
}
