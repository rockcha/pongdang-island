import {useEffect,useState} from 'react'
import {merchantPotions,type PracticeState} from './practice-state'
import './thief-potion-effect.css'

export function ThiefPotionEffect({stolen}:{stolen:PracticeState['potions']}){
 const {health,mana}=stolen,[visible,setVisible]=useState(health+mana>0)
 useEffect(()=>{
  if(health+mana===0){setVisible(false);return}
  setVisible(true)
  const timer=setTimeout(()=>setVisible(false),1600)
  return()=>clearTimeout(timer)
 },[health,mana])
 if(!visible||health+mana===0)return null
 return <div className="thief-potion-effect" role="status" aria-label="포션 도난" aria-live="polite" aria-atomic="true">
  {merchantPotions.filter(potion=>stolen[potion.kind]>0).map(potion=><div className="thief-stolen-potion" key={potion.kind} data-kind={potion.kind}>
   <div><img src={potion.image} alt="" draggable={false}/><strong>−{stolen[potion.kind]}</strong></div><small>{potion.name}</small>
  </div>)}
 </div>
}
