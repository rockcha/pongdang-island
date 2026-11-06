import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {GoldChange} from '@/features/gold/gold-change'
import './farm-gold.css'

// Local trial balance only. Reset/undo explicitly reset the comparison baseline.
export function useFarmGoldSpend(gold:number){
 const previous=useRef(gold),sequence=useRef(0)
 const [receipt,setReceipt]=useState<{id:number;delta:number}|null>(null)
 useEffect(()=>{const delta=gold-previous.current;previous.current=gold;if(delta<0)setReceipt({id:++sequence.current,delta})},[gold])
 useEffect(()=>{if(!receipt)return;const timer=window.setTimeout(()=>setReceipt(null),1400);return()=>window.clearTimeout(timer)},[receipt])
 function reset(nextGold:number){previous.current=nextGold;setReceipt(null)}
 const effect=receipt?createPortal(<div key={receipt.id} className="farm-gold-spend" role="status" aria-live="polite" data-farm-gold-spent={-receipt.delta}><GoldChange delta={receipt.delta}/></div>,document.body):null
 return {effect,reset}
}
