import {useEffect,useRef,useState} from 'react'
import {npcFarewellDelay,pickNpcLine} from './npc-dialogue'

export type ConversationMemory=Map<readonly string[],string>
export function useNpcConversation(greeting:string|readonly string[],onTalk:(text:string)=>void,onDescend:()=>void,memory?:ConversationMemory){
 const [intro]=useState(()=>typeof greeting==='string'?greeting:pickNpcLine(greeting,memory?.get(greeting)))
 const [reply,setReply]=useState(intro),[departing,setDeparting]=useState(false)
 const previous=useRef(memory??new Map<readonly string[],string>())
 const introduced=useRef(false),leaving=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 const talk=useRef(onTalk),descend=useRef(onDescend);talk.current=onTalk;descend.current=onDescend
 useEffect(()=>{
  if(!introduced.current){introduced.current=true;if(typeof greeting!=='string')previous.current.set(greeting,intro);talk.current(intro)}
  return()=>clearTimeout(timer.current)
 },[intro])
 function say(lines:readonly string[]){
  const line=pickNpcLine(lines,previous.current.get(lines))
  previous.current.set(lines,line);setReply(line);talk.current(line)
  return line
 }
 function depart(lines:readonly string[]){
  if(leaving.current)return
  leaving.current=true;setDeparting(true)
  const line=say(lines)
  timer.current=setTimeout(()=>descend.current(),npcFarewellDelay(line))
 }
 return {reply,departing,say,depart}
}
