import {buildingCapacity,warehouseCapacity} from './building-upgrades'
import {farmAnimalHousing} from './farm-simulation'
import {topviewItems,type FarmTool,type TopviewObject,type TopviewState} from './topview-model'
import './building-info.css'
import {ChevronDown} from 'lucide-react'

const purposes:Partial<Record<FarmTool,string>>={
 warehouse:'수확한 농작물과 축산물·가공품을 함께 보관해요.',
 livestockOffice:'동물 정원을 늘리고 더 많은 동물을 키울 수 있게 해요.',
 office:'새 밭을 개간할 수 있는 한도를 늘려요.',
 seedShop:'연구한 작물의 종자를 구매하고 밭에 심어요.',
 store:'농작물과 축산물을 오늘의 주문에 맞춰 납품해요.',
 processed:'빵·디저트·음료 등 완성된 음식만 주문에 맞춰 납품해요.',
 barn:'젖소와 염소를 구매하고 키울 수 있는 거처예요.',
 coop:'닭과 오리를 구매하고 키울 수 있는 거처예요.',
 lab:'새 작물을 연구해 종자 상점에서 구매할 수 있게 해요.',
 mill:'벼를 쌀로 도정하고, 곡물과 사탕수수를 가루·설탕으로 가공해요.',
 kitchen:'토마토와 설탕으로 케첩을 만들고, 쌀푸딩·구운주먹밥을 요리해요.',
 bakery:'밀가루·달걀·우유 등으로 과자와 빵을 만들어요.',
 dairy:'우유로 유제품과 음료를 만들어요.',
}
export function BuildingInfo({object,state}:{object:TopviewObject;state:TopviewState}){
 const kind=object.kind,purpose=purposes[kind]
 if(!purpose)return null
 let effects:string[]=[]
 if(kind==='warehouse')effects=[`이 건물 ${buildingCapacity(object)}칸 · 전체 ${warehouseCapacity(state)}칸`,'같은 품목은 수량과 관계없이 1칸 사용']
 else if(kind==='livestockOffice')effects=[`동물 정원 +${buildingCapacity(object)}마리`,'업그레이드할 때마다 전체 동물 정원 2마리 증가','보관·준비 중인 동물도 정원에 포함']
 else if(kind==='office')effects=[`밭 한도 +${buildingCapacity(object)}칸`,'업그레이드할 때마다 밭 한도 증가']
 else if(kind==='store'||kind==='processed')effects=['생산 가능한 상품 중 매일 최대 5종 · 종류마다 5~10개 주문','여러 채 건설 가능 · 건물별 별도 주문']
 else if(kind==='barn'||kind==='coop'){
  const animal=kind==='barn'?'cow':'chicken',housing=farmAnimalHousing(state,animal)
  effects=['전체 동물 정원은 축산 관리소에서 확장',`전체 ${housing.total} / ${housing.capacity}마리 · 보관·준비 포함`,'여러 채 건설 가능']
 }else if(kind==='mill'||kind==='bakery'||kind==='dairy'||kind==='kitchen')effects=['건물당 같은 제품을 한 번에 최대 2개 생산',kind==='dairy'?'다른 생산 시설과 독립적으로 작업':'여러 채 건설 가능 · 건물별 독립 생산']
 else if(kind==='lab')effects=['한 번에 작물 1종 연구','완료한 종자는 계속 구매 가능']
 else if(kind==='seedShop')effects=['구매한 종자는 밭 한 칸당 1개 사용']
 return <section className="farm-building-info" aria-label={`${topviewItems[kind].name} 용도와 효과`}><details><summary><span>{purpose}</span><ChevronDown aria-hidden="true"/></summary><ul>{effects.map(effect=><li key={effect}>{effect}</li>)}</ul></details></section>
}
