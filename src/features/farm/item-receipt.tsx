import type {ReactNode} from 'react'
import {createPortal} from 'react-dom'
import './harvest-receipt.css'

export const FARM_RECEIPT_MS=1200

export function FarmItemReceipt({id,art,label,quantity,detail,className='',effect}:{id:number;art:ReactNode;label:string;quantity?:number;detail?:string;className?:string;effect?:string}){
 return createPortal(<div key={id} className={`farm-item-receipt ${className}`} role="status" aria-live="polite" aria-label={label} data-farm-effect={effect}>
  <span className="sr-only">{label}</span>
  <div className="farm-harvest-receipt" aria-hidden="true"><div className="farm-item-receipt-content"><span className="farm-item-receipt-art">{art}</span>{quantity!==undefined&&<strong>+{quantity.toLocaleString('ko-KR')}</strong>}</div>{detail&&<small>{detail}</small>}</div>
 </div>,document.body)
}
