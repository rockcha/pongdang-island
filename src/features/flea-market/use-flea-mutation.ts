import {useEffect,useRef,useState} from 'react'
import {confirmedFleaFailure,fleaError} from './api'

/** An uncertain result keeps its exact operation ID and payload until confirmed. */
export function useFleaMutation<T,R=unknown>(execute:(args:T)=>Promise<R>,onSuccess?:(result:R)=>void){
 const request=useRef<T|null>(null),locked=useRef(false),alive=useRef(true)
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 async function run(args:T){
  if(locked.current)return false
  request.current??=structuredClone(args);locked.current=true;setBusy(true);setError('')
  try{const result=await execute(request.current);if(!alive.current)return false;request.current=null;onSuccess?.(result);return true}
  catch(cause){if(alive.current){if(confirmedFleaFailure(cause))request.current=null;setError(fleaError(cause))}return false}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 return {run,busy,error,pending:request.current!==null}
}
