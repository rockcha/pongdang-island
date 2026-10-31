import {useEffect,useRef,useState} from 'react'
import {Check} from 'lucide-react'

type PurchaseItem={name:string;image?:string;acquired?:boolean;kind:'weapon'|'armor'|'magic'|'potion'}
export function usePurchaseReceipt(){
 const [receipt,setReceipt]=useState<(PurchaseItem&{key:number})|null>(null)
 const sequence=useRef(0)
 useEffect(()=>{
  if(!receipt)return
  const timer=setTimeout(()=>setReceipt(null),1900)
  return()=>clearTimeout(timer)
 },[receipt])
 return {receipt,showReceipt:(item:PurchaseItem)=>setReceipt({...item,key:++sequence.current})}
}
export function PurchaseReceipt({item}:{item:PurchaseItem}){
 return <div className="exploration-purchase-overlay" role="status" aria-label={item.acquired?'아이템 획득':'구매 알림'} aria-live="polite" aria-atomic="true"><div className="exploration-purchase-receipt">
  <span className="exploration-purchase-label"><Check size={14}/>{item.acquired?'획득 완료':'구매 완료'}</span>
  <div className="exploration-purchase-art">{item.image&&<img src={item.image} alt="" draggable={false}/>}</div>
  <strong>{item.name}</strong><small>{item.kind==='magic'?'마법을 습득했습니다':'보관함에 추가되었습니다'}</small>
 </div></div>
}
