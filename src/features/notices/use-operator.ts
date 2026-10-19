import {useEffect,useState} from 'react'
import {useAuth} from '@/components/auth-provider'
import {isNoticeOperator} from './api'

export function useOperator(){
 const {session,recovery}=useAuth(),owner=session?.user.id
 const [state,setState]=useState<{owner:string;allowed:boolean}|null>(null)
 useEffect(()=>{
  if(!owner||recovery)return
  let active=true
  void isNoticeOperator().then(allowed=>{if(active)setState({owner,allowed})}).catch(()=>{if(active)setState({owner,allowed:false})})
  return()=>{active=false}
 },[owner,recovery])
 return {operator:!!owner&&!recovery&&state?.owner===owner&&state?.allowed===true,loading:!!owner&&!recovery&&state?.owner!==owner}
}
