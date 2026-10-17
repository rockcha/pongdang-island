import {useState} from 'react'
import {Feeding} from './feeding'
import {Cleaning} from './cleaning'
export function AquariumCare({tank}:{tank:string}){
 const [mode,setMode]=useState<'feed'|'clean'|null>(null)
 return <><Feeding tank={tank} blocked={mode==='clean'} onActiveChange={active=>setMode(active?'feed':null)}/><Cleaning tank={tank} blocked={mode==='feed'} onActiveChange={active=>setMode(active?'clean':null)}/></>
}
