import {useRef} from 'react'
import {playPurchaseSound} from '@/features/gold/purchase-sound'
import type {PracticeState} from './practice-state'

// Practice trades resolve locally. Play once after a successful state transition,
// outside React state updaters, which can run twice in development StrictMode.
export function useExplorationTrade(state:PracticeState,onChange:React.Dispatch<React.SetStateAction<PracticeState>>){
 const latest=useRef(state);latest.current=state
 return (command:(state:PracticeState)=>PracticeState)=>{
  const previous=latest.current,next=command(previous)
  if(next===previous)return false
  latest.current=next;onChange(next)
  playPurchaseSound(`exploration:${crypto.randomUUID()}`)
  return true
 }
}
