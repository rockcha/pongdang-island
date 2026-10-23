import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {loadPlayerLevels} from './api'
import {LevelTag} from './level-insignia'

const Context=createContext<{levels:Record<string,number>;register:(id:string,friendCode?:string)=>()=>void}|null>(null)

/** One account-scoped queue batches every visible identity; no per-row RPCs. */
export function PlayerLevelsProvider({children}:{children:ReactNode}){
 const [levels,setLevels]=useState<Record<string,number>>({})
 const cache=useRef(new Map<string,{level:number;at:number}>()),visible=useRef(new Map<string,number>())
 const pending=useRef(new Set<string>()),timer=useRef<ReturnType<typeof setTimeout>|null>(null),active=useRef(true)
 const sequence=useRef(0),latest=useRef(new Map<string,number>())
 const codes=useRef(new Map<string,string>())
 const enqueue=useCallback((id:string)=>{
  pending.current.add(id)
  if(timer.current!==null)return
  timer.current=setTimeout(()=>{
   timer.current=null
   const ids=[...pending.current];pending.current.clear()
   for(let i=0;i<ids.length;i+=100){
    const batch=ids.slice(i,i+100),revision=++sequence.current
    for(const id of batch)latest.current.set(id,revision)
    void loadPlayerLevels(batch,batch.flatMap(id=>codes.current.has(id)?[codes.current.get(id)!]:[])).then(data=>{
     if(!active.current)return
     const current=data.filter(row=>latest.current.get(row.userId)===revision)
     for(const row of current)cache.current.set(row.userId,{level:row.level,at:Date.now()})
     setLevels(old=>({...old,...Object.fromEntries(current.map(row=>[row.userId,row.level]))}))
    }).catch(()=>{/* A failed lookup must never block the underlying identity. */})
   }
  },20)
 },[])
 const register=useCallback((id:string,friendCode?:string)=>{
  if(friendCode)codes.current.set(id,friendCode)
  visible.current.set(id,(visible.current.get(id)??0)+1)
  const saved=cache.current.get(id)
  if(!saved||Date.now()-saved.at>60000)enqueue(id)
  return()=>{const count=(visible.current.get(id)??1)-1;if(count)visible.current.set(id,count);else visible.current.delete(id)}
 },[enqueue])
 useEffect(()=>{
  active.current=true
  const refresh=()=>{if(document.visibilityState==='visible')for(const id of visible.current.keys())enqueue(id)}
  const poll=setInterval(refresh,60000)
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh)
  return()=>{active.current=false;if(timer.current!==null)clearTimeout(timer.current);timer.current=null;clearInterval(poll);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh)}
 },[enqueue])
 return <Context.Provider value={{levels,register}}>{children}</Context.Provider>
}

export function PlayerLevel({userId,avatar=false,friendCode}:{userId?:string|null;avatar?:boolean;friendCode?:string}){
 const context=useContext(Context),register=context?.register
 useEffect(()=>{if(userId&&register)return register(userId,friendCode)},[userId,friendCode,register])
 const level=userId?context?.levels[userId]:undefined
 if(level===undefined)return null
 return <AvatarLevelBadge level={level} avatar={avatar}/>
}

export function AvatarLevelBadge({level,avatar=true}:{level:number;avatar?:boolean}){
 return <span className={`pointer-events-auto z-10 inline-flex shrink-0 ${avatar?'absolute -right-1 -top-1':'relative'}`}><LevelTag level={level} className={avatar?'size-5 rounded-full bg-background shadow-sm ring-1 ring-border/50 [&>svg]:size-4':'size-6 [&>svg]:size-4'}/></span>
}
