import {useEffect,useRef} from 'react'
import {useAuth} from '@/components/auth-provider'
import {pushAccount} from './push-device'

export function PushAccountSync(){
 const {session,loading}=useAuth(),sequence=useRef(Promise.resolve())
 useEffect(()=>{
  if(loading)return
  const userId=session?.user.id
  // Serialize writes across rapid sign-out/sign-in events. Page unmount is not logout.
  sequence.current=sequence.current.catch(()=>{}).then(()=>pushAccount(userId)).catch(()=>{})
 },[session?.user.id,loading])
 return null
}
