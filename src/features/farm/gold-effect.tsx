import {createPortal} from 'react-dom'
import {Coins} from 'lucide-react'

export function FarmGoldEffect({amount,label,id}:{amount:number;label:string;id:number}){
 return createPortal(<div key={id} className="farm-sale-effect" role="status" aria-live="polite" data-farm-resale="true"><div className="farm-sale-card"><span className="farm-sale-coin"><Coins size={36}/></span><strong>+ {amount.toLocaleString()} G</strong><span>{label}</span></div></div>,document.body)
}
