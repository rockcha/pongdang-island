import {LockKeyhole} from 'lucide-react'
import {FarmGoodIcon} from './farm-good-icon'
import {farmGoods,type FarmGood} from './farm-simulation'

export function FarmItemPicker<T extends FarmGood>({items,value,onChange,label,isLocked,owned,detail,compactCount=false}:{items:readonly T[];value:T;onChange:(value:T)=>void;label:string;isLocked?:(value:T)=>boolean;owned?:(value:T)=>number;detail?:(value:T)=>string;compactCount?:boolean}){
 return <div className="farm-item-selector"><div className="farm-item-selector-heading"><span>{label}</span><small>{items.length}종</small></div><div className="farm-item-picker" role="group" aria-label={label}>{items.map(good=><button key={good} aria-label={`${farmGoods[good].name} 선택`} aria-pressed={value===good} data-locked={isLocked?.(good)||undefined} onClick={event=>{onChange(good);event.currentTarget.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'smooth'})}}><FarmGoodIcon good={good}/><span>{farmGoods[good].name.replace(' 종자','')}</span>{detail&&<small className="farm-picker-detail">{detail(good)}</small>}{owned?<b className="farm-picker-owned">{compactCount?`×${owned(good)}`:`× ${owned(good)}개`}</b>:null}{isLocked?.(good)&&<LockKeyhole size={10}/>}</button>)}</div></div>
}
