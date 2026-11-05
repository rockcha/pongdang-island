import {LockKeyhole} from 'lucide-react'
import {FarmGoodIcon} from './farm-good-icon'
import {farmGoods,type FarmGood} from './farm-simulation'

export function FarmItemPicker<T extends FarmGood>({items,value,onChange,label,isLocked,owned,compactCount=false}:{items:readonly T[];value:T;onChange:(value:T)=>void;label:string;isLocked?:(value:T)=>boolean;owned?:(value:T)=>number;compactCount?:boolean}){
 return <div className="farm-item-selector"><div className="farm-item-selector-heading"><span>{label}</span><small>{items.length}종 · 좌우로 보기</small></div><div className="farm-item-picker" role="group" aria-label={label}>{items.map(good=><button key={good} aria-label={`${farmGoods[good].name} 선택`} aria-pressed={value===good} data-locked={(owned?owned(good)===0:isLocked?.(good))||undefined} onClick={event=>{onChange(good);event.currentTarget.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'smooth'})}}><FarmGoodIcon good={good}/><span>{farmGoods[good].name.replace(' 종자','')}</span>{owned?<b className="farm-picker-owned">{compactCount?`×${owned(good)}`:`× ${owned(good)}개`}</b>:isLocked?.(good)&&<LockKeyhole size={10}/>}</button>)}</div></div>
}
