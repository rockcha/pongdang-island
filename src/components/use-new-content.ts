import {useEffect,useState} from 'react'
import {useLocation} from 'react-router'
import {useAuth} from './auth-provider'
import {createClient} from '@/lib/client'
import {isAuthFailure} from '@/lib/background-session'
import {useAccountResource} from '@/lib/account-query'
import {readNewContent,type ContentSource} from '@/lib/new-content'

const sources:ContentSource[]=['board','exchange','flea','suggestions','bugs','showcase','merchant']
const sourcePaths:Record<ContentSource,string>={board:'/board',exchange:'/exchange',flea:'/flea-market',suggestions:'/square/suggestions',bugs:'/square/bugs',showcase:'/showcase',merchant:'/merchant-orders'}
const emptyState={board:false,exchange:false,flea:false,suggestions:false,bugs:false,showcase:false,merchant:false}
const seenKey=(owner:string,source:ContentSource)=>'pongdang:content-seen:'+owner+':'+source
function seen(owner:string,source:ContentSource){
 try{return Number(localStorage.getItem(seenKey(owner,source)))||0}catch{return 0}
}
function visiting(path:string,source:ContentSource){
 const destination=sourcePaths[source]
 return path===destination||(source!=='showcase'&&path.startsWith(destination+'/'))
}

export function useNewContent(){
 const {session,recovery}=useAuth(),owner=session?.user.id
 const {pathname}=useLocation()
 const [blockedOwner,setBlockedOwner]=useState<string|null>(null)
 const [,tick]=useState(0)
 const query=useAccountResource('new-content',readNewContent,{enabled:blockedOwner!==owner})
 const latest=query.data
 useEffect(()=>{
  if(owner&&isAuthFailure(query.error))setBlockedOwner(owner)
 },[owner,query.error])
 useEffect(()=>{
  if(!owner||recovery)return
  const {data:{subscription}}=createClient().auth.onAuthStateChange(()=>setBlockedOwner(null))
  return()=>subscription.unsubscribe()
 },[owner,recovery])
 useEffect(()=>{
  if(!owner||recovery||!latest)return
  for(const source of sources){
   const newest=Date.parse(latest[source]??'')||0
   if(visiting(pathname,source)&&newest>seen(owner,source)){
    try{localStorage.setItem(seenKey(owner,source),String(newest))}catch{}
   }
  }
 },[owner,recovery,latest,pathname])
 useEffect(()=>{
  const storage=(event:StorageEvent)=>{if(owner&&event.key?.startsWith('pongdang:content-seen:'+owner+':'))tick(n=>n+1)}
  window.addEventListener('storage',storage)
  return()=>window.removeEventListener('storage',storage)
 },[owner])
 if(!owner||recovery||!latest)return emptyState
 const updates={...emptyState}
 for(const source of sources)updates[source]=!visiting(pathname,source)&&(Date.parse(latest[source]??'')||0)>seen(owner,source)
 return updates
}
