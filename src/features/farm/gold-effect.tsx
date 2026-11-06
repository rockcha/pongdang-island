import {FarmGold,FarmGoldIcon} from './farm-gold'
import {createPortal} from 'react-dom'


export function FarmGoldEffect({amount,label,id}:{amount:number;label:string;id:number}){
 return createPortal(<div key={id} className="farm-sale-effect" role="status" aria-live="polite" data-farm-resale="true"><div className="farm-sale-card"><span className="farm-sale-coin"><FarmGoldIcon/></span><strong>+ <FarmGold amount={amount.toLocaleString()}/></strong><span>{label}</span></div></div>,document.body)
}
