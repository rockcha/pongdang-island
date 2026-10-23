import {createContext,useContext,useEffect,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {GoldChange} from '@/features/gold/gold-change'
import {useAuth} from '@/components/auth-provider'
import {loadExperience} from './api'
import type {ExperienceState} from './api'
import {PlayerLevelsProvider} from './player-level'

type ExperienceContextValue={state:ExperienceState|null;loading:boolean;error:boolean;refresh:()=>void}
const ExperienceContext=createContext<ExperienceContextValue|null>(null)

export function ExperienceProvider({children}:{children:ReactNode}){
 const {session}=useAuth()
 return <AccountExperience key={session?.user.id??'guest'} userId={session?.user.id}>{children}</AccountExperience>
}
function AccountExperience({children,userId}:{children:ReactNode;userId?:string}){
 const [state,setState]=useState<ExperienceState|null>(null)
 const [loading,setLoading]=useState(Boolean(userId)),[error,setError]=useState(false)
 const reload=useRef<()=>void>(()=>{})
 const [effects,setEffects]=useState<{id:number;amount:number;level:number|null}[]>([])
 const sequence=useRef(0),timers=useRef<ReturnType<typeof setTimeout>[]>([])
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);timers.current=[]},[])
 useEffect(()=>{
  if(!userId)return
  let active=true,request=0,previous:ExperienceState|null=null
  async function refresh(notify=false){
   const version=++request
   try{
    const data=await loadExperience()
    if(!active||version!==request)return
    if(notify&&previous&&data.totalXp>previous.totalXp){
     const amount=data.totalXp-previous.totalXp
     const level=data.level>previous.level?data.level:null
     const id=++sequence.current
     setEffects(items=>[...items.slice(-2),{id,amount,level}])
     const timer=setTimeout(()=>{
      setEffects(items=>items.filter(item=>item.id!==id))
      timers.current=timers.current.filter(item=>item!==timer)
     },1400)
     timers.current.push(timer)
    }
    previous=data;setState(data);setError(false)
   }catch{if(active&&version===request)setError(true)}
   finally{if(active&&version===request)setLoading(false)}
  }
  reload.current=()=>{void refresh()}
  const activity=()=>{void refresh(true)}
  const visible=()=>{if(document.visibilityState==='visible')void refresh()}
  void refresh()
  window.addEventListener('experience-changed',activity)
  window.addEventListener('focus',visible);window.addEventListener('online',visible)
  document.addEventListener('visibilitychange',visible)
  return()=>{active=false;reload.current=()=>{};window.removeEventListener('experience-changed',activity);window.removeEventListener('focus',visible);window.removeEventListener('online',visible);document.removeEventListener('visibilitychange',visible)}
 },[userId])
 return <ExperienceContext.Provider value={{state,loading,error,refresh:()=>reload.current()}}>
  <PlayerLevelsProvider self={state&&userId?{userId,level:state.level,levelProgress:state.currentXp/state.nextLevelXp}:undefined}>{children}</PlayerLevelsProvider>
  {createPortal(<div data-experience-effects className="pointer-events-none fixed inset-0 z-[2147483000] flex items-center justify-center" aria-live="polite" aria-atomic="true">
   <div className="flex -translate-y-12 flex-col items-center gap-2">{effects.map(effect=><div key={effect.id} data-experience-effect className="flex flex-col items-center">
    {effect.level!==null&&<div className="gold-change gold-change-gain experience-change"><span className="gold-change-number" style={{fontSize:'1.125rem'}}>Lv.{effect.level} 달성!</span></div>}
    <GoldChange delta={effect.amount} resource="experience"/>
   </div>)}</div>
  </div>,document.body)}
 </ExperienceContext.Provider>
}
export function useExperience(){return useContext(ExperienceContext)}
