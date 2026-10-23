import {useEffect,useState} from 'react'
import {loadFriendLevels} from './api'

export function useFriendLevels(owner:string|undefined,friendKey:string){
 const [snapshot,setSnapshot]=useState<{owner:string;key:string;levels:Record<string,number>}|null>(null)
 const [error,setError]=useState(false)
 useEffect(()=>{
  let alive=true,inFlight=false
  setError(false)
  if(!owner||!friendKey)return
  async function reload(){
   if(inFlight||document.visibilityState==='hidden')return
   inFlight=true
   try{
    const friends=await loadFriendLevels()
    if(alive){setSnapshot({owner:owner!,key:friendKey,levels:Object.fromEntries(friends.map(friend=>[friend.friendId,friend.level]))});setError(false)}
   }catch{if(alive)setError(true)}
   finally{inFlight=false}
  }
  void reload()
  const refresh=()=>void reload(),poll=setInterval(refresh,60000)
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh)
  return()=>{alive=false;clearInterval(poll);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh)}
 },[owner,friendKey])
 return {levels:snapshot?.owner===owner&&snapshot?.key===friendKey?snapshot.levels:{},error}
}
