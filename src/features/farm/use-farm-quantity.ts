import {useState,type InputHTMLAttributes,type SetStateAction} from 'react'

// Keep an empty editing draft separate from the safe numeric preview used by forms.
export function useFarmQuantity(initial=1){
 const [draft,setDraft]=useState(String(initial))
 const quantity=draft===''?1:Number(draft)
 const quantityValid=draft!==''&&Number.isSafeInteger(quantity)&&quantity>=1
 function setQuantity(next:SetStateAction<number>){
  setDraft(previous=>String(typeof next==='function'?next(previous===''?1:Number(previous)):next))
 }
 function quantityInput(max:number,onValueChange?:(value:number)=>void):InputHTMLAttributes<HTMLInputElement>{
  const clamp=(value:number)=>Math.max(1,Math.min(Math.max(1,max),Math.floor(value)||1))
  return {type:'number',inputMode:'numeric',min:1,max:Math.max(1,max),value:draft===''?'':clamp(quantity),onChange:event=>{
   const value=event.target.value
   if(!/^\d*$/.test(value))return
   if(value===''){setDraft('');return}
   const next=clamp(Number(value));setDraft(String(next));onValueChange?.(next)
  },onBlur:()=>{const next=clamp(quantity);setDraft(String(next));onValueChange?.(next)}}
 }
 return {quantity,setQuantity,quantityInput,quantityValid}
}
