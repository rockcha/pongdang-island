import {useEffect,useState} from 'react'
import {Droplets,Heart} from 'lucide-react'
import type {ResourceDelta} from './room-effect-details'
import './effect-facts.css'
export function RecoveryEffect({amount}:{amount:ResourceDelta}){
 const [visible,setVisible]=useState(true)
 useEffect(()=>{const timer=setTimeout(()=>setVisible(false),1800);return()=>clearTimeout(timer)},[])
 if(!visible)return null
 return <div className="exploration-recovery-effect" aria-live="polite" role="status" aria-label="회복 완료"><div className="exploration-recovery-rings" aria-hidden="true"><i/><i/><i/></div><div className="exploration-recovery-numbers"><small>기운이 차오릅니다</small>{amount.hp>0&&<strong data-resource="health"><Heart size={22}/>체력 +{amount.hp}</strong>}{amount.mp>0&&<strong data-resource="mana"><Droplets size={22}/>마나 +{amount.mp}</strong>}{amount.hp===0&&amount.mp===0&&<strong>체력과 마나가 가득 찼습니다</strong>}</div></div>
}
