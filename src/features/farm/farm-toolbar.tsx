import {Grid2X2,Package,Pencil,Sprout,Store} from 'lucide-react'
import {LandBadge} from './land-controls'
import {FarmCountBadge} from './count-badge'

type Props={landStock:number;tileStock:number;storageCount:number;landActive:boolean;farmActive:boolean;tileActive:boolean;storageActive:boolean;shopOpen:boolean;editing:boolean;onLand:()=>void;onFarm:()=>void;onTile:()=>void;onShop:()=>void;onStorage:()=>void;onEdit:()=>void}
export function FarmToolbar(props:Props){
 return <nav className="farm-crop-tools" aria-label="농사 도구">
  <button aria-pressed={props.editing} onClick={props.onEdit}><Pencil size={19}/><span>편집하기</span></button>
  <button aria-label={`땅 ${props.landStock}칸 보유`} aria-expanded={props.landActive} aria-controls="farm-land-menu" aria-pressed={props.landActive} onClick={props.onLand}><LandBadge count={props.landStock}/><span>땅</span></button>
  <button aria-expanded={props.farmActive} aria-controls="farm-work-menu" aria-pressed={props.farmActive} onClick={props.onFarm}><Sprout size={19}/><span>농사</span></button>
  <button aria-label="타일" aria-expanded={props.tileActive} aria-controls="farm-tile-menu" aria-pressed={props.tileActive} onClick={props.onTile}><span className="farm-toolbar-icon"><Grid2X2 size={19}/><FarmCountBadge count={props.tileStock} label="보유 타일"/></span><span>타일</span></button>
  <button aria-pressed={props.shopOpen} onClick={props.onShop}><Store size={19}/><span>상점</span></button>
  <button aria-label="보관함" aria-expanded={props.storageActive} aria-controls="farm-storage-menu" aria-pressed={props.storageActive} onClick={props.onStorage}><span className="farm-toolbar-icon"><Package size={19}/><FarmCountBadge count={props.storageCount} label="전체 보관"/></span><span>보관함</span></button>
 </nav>
}
