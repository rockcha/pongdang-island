import {Package,Pickaxe,Pencil,Sprout,Store} from 'lucide-react'
import {LandBadge} from './land-controls'

type Props={landStock:number;landActive:boolean;clearing:boolean;shopOpen:boolean;seedOpen:boolean;editing:boolean;onLand:()=>void;onClear:()=>void;onShop:()=>void;onSeed:()=>void;onStorage:()=>void;onEdit:()=>void}
export function FarmToolbar(props:Props){
 return <nav className="farm-crop-tools" aria-label="농사 도구">
  <button aria-label={`땅 ${props.landStock}칸 보유`} aria-pressed={props.landActive} onClick={props.onLand}><LandBadge count={props.landStock}/><span>땅</span></button>
  <button aria-pressed={props.clearing} onClick={props.onClear}><Pickaxe size={19}/><span>개간하기</span></button>
  <button aria-pressed={props.shopOpen} onClick={props.onShop}><Store size={19}/><span>상점</span></button>
  <button aria-pressed={props.seedOpen} onClick={props.onSeed}><Sprout size={19}/><span>씨앗 심기</span></button>
  <button onClick={props.onStorage}><Package size={19}/><span>보관함</span></button>
  <button aria-pressed={props.editing} onClick={props.onEdit}><Pencil size={19}/><span>편집하기</span></button>
 </nav>
}
