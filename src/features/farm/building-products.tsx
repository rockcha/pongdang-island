import {TopviewArt} from './topview-art'
import {Shovel,PawPrint} from 'lucide-react'
import {farmAnimals,farmAnimalKinds} from './animal-catalog'
import {meatGoods} from './butcher-catalog'
import {farmRecipes,recipeIds,millProducts} from './food-catalog'
import {farmGoods,type FarmGood} from './farm-simulation'
import {FarmGoodIcon} from './farm-good-icon'
import type {FarmTool} from './topview-model'
import {isProcessingBuilding} from './workshop-catalog'
import {farmSupplyKinds} from './supply-catalog'
import './building-products.css'

export function FarmBuildingProducts({kind}:{kind:FarmTool}){
 if(kind==='office'||kind==='livestockOffice')return <div className="farm-shop-capacity-benefit">{kind==='office'?<Shovel size={17}/>:<PawPrint size={17}/>}<strong>{kind==='office'?'밭 한도 +4칸':'동물 정원 +2마리'}</strong><small>{kind==='office'?'밭을 더 개간할 수 있어요':'동물을 더 키울 수 있어요'}</small></div>
 const products:FarmGood[]=kind==='agriShop'?[...farmSupplyKinds]:kind==='mill'?[...millProducts]:kind==='butcher'?[...meatGoods]:isProcessingBuilding(kind)?recipeIds.filter(id=>farmRecipes[id].building===kind):kind==='barn'||kind==='coop'?farmAnimalKinds.filter(id=>farmAnimals[id].housing===kind).map(id=>farmAnimals[id].product):[]
 if(kind==='barn'||kind==='coop')return <div className="farm-building-products" role="group" aria-label="구매 가능한 동물"><small>동물</small><div>{farmAnimalKinds.filter(id=>farmAnimals[id].housing===kind).map(id=><span key={id} title={farmAnimals[id].name} role="img" aria-label={farmAnimals[id].name}><TopviewArt kind={id}/></span>)}</div></div>
 if(!products.length)return null

 return <div className="farm-building-products" role="group" aria-label={kind==='agriShop'?'판매하는 물품':'생산 가능한 물품'}>
  <small>{kind==='agriShop'?'판매':'생산품'}</small>
  <div>{products.map(good=><span key={good} title={farmGoods[good].name} role="img" aria-label={farmGoods[good].name}><FarmGoodIcon good={good}/></span>)}</div>
 </div>
}
