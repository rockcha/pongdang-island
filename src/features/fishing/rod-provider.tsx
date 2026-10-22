import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {useAuth} from '@/components/auth-provider'
import {fishingRods} from './fishing-rods'
import {equipRod,loadRods,rodError,type RodState} from './rod-api'

const empty:RodState={owned:[],selected:'basic',catalog:[],baits:[]}
type RodContextValue=RodState&{loading:boolean;busy:boolean;error:string;refresh:()=>Promise<void>;select:(id:string)=>Promise<void>;rods:typeof fishingRods}
const RodContext=createContext<RodContextValue|null>(null)
export function RodProvider({children}:{children:ReactNode}){
 const {session}=useAuth()
 return <AccountRods key={session?.user.id??'guest'} userId={session?.user.id}>{children}</AccountRods>
}
function AccountRods({children,userId}:{children:ReactNode;userId?:string}){
 const [state,setState]=useState<RodState>(empty),[loading,setLoading]=useState(!!userId),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const alive=useRef(true),locked=useRef(false),version=useRef(0)
 async function refresh(){
  if(!userId||locked.current)return
  const request=++version.current
  try{const data=await loadRods();if(alive.current&&request===version.current){setState(data);setError('')}}
  catch(cause){if(alive.current&&request===version.current)setError(rodError(cause))}
  finally{if(alive.current&&request===version.current)setLoading(false)}
 }
 useEffect(()=>{
  alive.current=true;void refresh()
  const reload=()=>{if(document.visibilityState==='visible')void refresh()}
  window.addEventListener('fishing-rods-changed',reload);window.addEventListener('expedition-changed',reload);window.addEventListener('attendance-changed',reload);window.addEventListener('focus',reload);window.addEventListener('online',reload)
  return()=>{alive.current=false;version.current++;window.removeEventListener('fishing-rods-changed',reload);window.removeEventListener('expedition-changed',reload);window.removeEventListener('attendance-changed',reload);window.removeEventListener('focus',reload);window.removeEventListener('online',reload)}
  // Remount on account changes; never reuse another player's ownership.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[userId])
 async function select(id:string){
  if(!userId||locked.current||loading)return
  locked.current=true;version.current++;setBusy(true)
  try{const data=await equipRod(id);if(alive.current){setState(data);setError('')}}
  catch(cause){throw new Error(rodError(cause))}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 const rods=fishingRods.flatMap(art=>{
  const item=state.catalog.find(item=>item.id===art.id)
  if(!item)return []
  return [{...art,name:item.name,price:item.price,region:item.region_id??undefined,failureReductionBp:item.failure_reduction_bp,nativeBonusBp:item.native_bonus_bp,waitReductionSeconds:item.wait_reduction_seconds??0}]
 })
 return <RodContext.Provider value={{...state,rods,loading,busy,error,refresh,select}}>{children}</RodContext.Provider>
}
// The disconnected/practice view can render the starter but cannot buy or equip.
export function useRods(){return useContext(RodContext)??{...empty,rods:fishingRods,loading:false,busy:false,error:'',refresh:async()=>{},select:async()=>{}}}
