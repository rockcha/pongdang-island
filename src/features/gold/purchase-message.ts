import {fishingRods} from '@/features/fishing/fishing-rods'
import {products,type Trade} from './wallet'

export function productObject(name:string){
 const last=name.charCodeAt(name.length-1)
 return name+(last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28!==0?'을':'를')
}
export function purchaseMessage(action:Trade){
 if(action.type==='charge')return null
 const name=action.name||products.find(item=>item.id===action.id)?.name
  ||(action.id.startsWith('rod:')?fishingRods.find(rod=>rod.id===action.id.slice(4))?.name:undefined)
  ||(action.id==='aquarium:tank'?'새 어항':action.id.startsWith('background:')?'어항 배경':action.id.startsWith('fishing:')?'미끼':action.id.startsWith('collectibles:')?'선택한 개체':'상품')
 return `${productObject(name)} ${action.type==='buy'?'구매':'판매'}했습니다.`
}
