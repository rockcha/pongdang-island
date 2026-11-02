import {useEffect,useState,type CSSProperties} from 'react'
import {Coins} from 'lucide-react'
import './gold-gain-effect.css'

export function GoldGainEffect({amount}:{amount:number}){
 const [visible,setVisible]=useState(true)
 useEffect(()=>{const timer=setTimeout(()=>setVisible(false),2000);return()=>clearTimeout(timer)},[])
 if(!visible)return null
 return <div className="exploration-gold-gain" role="status" aria-label="골드 획득" aria-live="polite" aria-atomic="true">
  <div className="gold-gain-burst" aria-hidden="true">{Array.from({length:8},(_,index)=><span key={index} style={{'--coin-angle':`${index*45}deg`} as CSSProperties}><Coins size={19}/></span>)}</div>
  <div className="gold-gain-amount"><Coins size={36} aria-hidden="true"/><small>골드 획득</small><strong>+{amount.toLocaleString()}<span> 골드</span></strong></div>
 </div>
}
