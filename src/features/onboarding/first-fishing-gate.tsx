import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react'
import {Navigate,Outlet,useLocation} from 'react-router'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {IslandLoading} from '@/components/island-loading'
import {firstFishingTutorial,tutorialError} from './api'
import type {FirstFishingState,TutorialAction} from './api'

const Context=createContext<{state:FirstFishingState;act:(action:TutorialAction)=>Promise<FirstFishingState>}|null>(null)
export function useFirstFishingCompleted(){return useContext(Context)?.state.step==='completed'}
export function useFirstFishingTutorial(){const value=useContext(Context);if(!value)throw Error('Tutorial provider is missing');return value}
export function FirstFishingGate(){
 const {session}=useAuth(),owner=session?.user.id,location=useLocation()
 const [record,setRecord]=useState<{owner:string;state:FirstFishingState}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 const request=useRef(0),activeOwner=useRef(owner);activeOwner.current=owner
 const actionInFlight=useRef(0)
 const act=useCallback(async(action:TutorialAction)=>{
  const version=++request.current,user=owner
  if(action!=='state')actionInFlight.current++
  try{
   const state=await firstFishingTutorial(action)
   if(user&&activeOwner.current===user&&version===request.current){
    setRecord({owner:user,state});setError('')
    // The first profile sync may have credited starter bait after the wallet
    // provider's initial request. Refresh before entering ordinary fishing.
    if(action==='state'&&state.required||action==='place')window.dispatchEvent(new Event('wallet-changed'))
   }
   if(action==='catch'||action==='place')window.dispatchEvent(new Event('collectibles-changed'))
   return state
  }finally{if(action!=='state')actionInFlight.current--}
 },[owner])
 useEffect(()=>{
  if(!owner)return
  let live=true
  setError('')
  void act('state').catch(error=>{if(live)setError(tutorialError(error))})
  const refresh=()=>{if(!document.hidden&&!actionInFlight.current)void act('state').catch(()=>{})}
  window.addEventListener('focus',refresh)
  return()=>{live=false;request.current++;window.removeEventListener('focus',refresh)}
 },[owner,retry,act])
 if(!record||record.owner!==owner){
  if(error)return <div role="alert" className="space-y-3 p-6 text-center text-sm"><p>{error}</p><Button onClick={()=>setRetry(value=>value+1)}>다시 확인</Button></div>
  return <IslandLoading/>
 }
 const state=record.state,onTutorial=location.pathname==='/first-fishing'
 return <Context.Provider value={{state,act}}>{state.required&&!onTutorial?<Navigate to="/first-fishing" replace/>:!state.required&&state.step==='inactive'&&onTutorial?<Navigate to="/aquarium" replace/>:<Outlet/>}</Context.Provider>
}
