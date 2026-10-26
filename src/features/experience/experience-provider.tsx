import {createContext,useContext,useEffect,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {GoldChange} from '@/features/gold/gold-change'
import {useAuth} from '@/components/auth-provider'
import {readExperience} from './api'
import {useAccountResource} from '@/lib/account-query'
import type {ExperienceState} from './api'
import {PlayerLevelsProvider} from './player-level'

type ExperienceContextValue={state:ExperienceState|null;loading:boolean;error:boolean;refresh:()=>void}
const ExperienceContext=createContext<ExperienceContextValue|null>(null)

export function ExperienceProvider({children}:{children:ReactNode}){
 const {session}=useAuth()
 return <AccountExperience key={session?.user.id??'guest'} userId={session?.user.id}>{children}</AccountExperience>
}
function AccountExperience({children,userId}:{children:ReactNode;userId?:string}){
 const query=useAccountResource('experience',readExperience)
 const state=query.data??null,loading=Boolean(userId)&&query.isPending,error=query.isError
 const previous=useRef<ExperienceState|null>(null)
 const [effects,setEffects]=useState<{id:number;amount:number}[]>([])
 const sequence=useRef(0),timers=useRef<ReturnType<typeof setTimeout>[]>([])
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);timers.current=[]},[])
 useEffect(()=>{
  if(!state)return
  if(previous.current&&state.totalXp>previous.current.totalXp){
   const amount=state.totalXp-previous.current.totalXp,id=++sequence.current
   setEffects(items=>[...items.slice(-2),{id,amount}])
   const timer=setTimeout(()=>{
    setEffects(items=>items.filter(item=>item.id!==id))
    timers.current=timers.current.filter(item=>item!==timer)
   },1400)
   timers.current.push(timer)
  }
  previous.current=state
 },[state])
 return <ExperienceContext.Provider value={{state,loading,error,refresh:()=>{void query.refetch({cancelRefetch:false})}}}>
  <PlayerLevelsProvider self={state&&userId?{userId,level:state.level,levelProgress:state.currentXp/state.nextLevelXp,currentXp:state.currentXp,nextLevelXp:state.nextLevelXp}:undefined}>{children}</PlayerLevelsProvider>
  {createPortal(<div data-experience-effects className="pointer-events-none fixed inset-0 z-[2147483000] flex items-center justify-center" aria-live="polite" aria-atomic="true">
   <div className="flex -translate-y-12 flex-col items-center gap-2">{effects.map(effect=><div key={effect.id} data-experience-effect className="flex flex-col items-center">
    <GoldChange delta={effect.amount} resource="experience"/>
   </div>)}</div>
  </div>,document.body)}
 </ExperienceContext.Provider>
}
export function useExperience(){return useContext(ExperienceContext)}
