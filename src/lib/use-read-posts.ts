import {useState} from 'react'
// Reading a post is a local UI preference, independent of its trade or cache state.
export function useReadPosts(owner:string,source='flea'){
 const key='pongdang:'+source+'-read:'+owner
 const [read,setRead]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string'):[]}catch{return []}})
 function mark(id:string){setRead(previous=>{const next=[id,...previous.filter(value=>value!==id)].slice(0,1000);try{localStorage.setItem(key,JSON.stringify(next))}catch{}return next})}
 return {unread:(id:string)=>!read.includes(id),mark}
}
