import {useEffect,useState} from 'react'
import {ChevronDown,ChevronUp} from 'lucide-react'
import {Feeding} from './feeding'
import {Cleaning} from './cleaning'
export function AquariumCare({tank}:{tank:string}){
 const [mode,setMode]=useState<'feed'|'clean'|null>(null)
 const [open,setOpen]=useState(()=>{try{return localStorage.getItem('pongdang:aquarium-care-open')==='true'}catch{return false}})
 useEffect(()=>{try{localStorage.setItem('pongdang:aquarium-care-open',String(open))}catch{/* Storage can be disabled. */}},[open])
 return <>
  <button type="button" aria-label={open?'먹이 주기·청소하기 접기':'먹이 주기·청소하기 펼치기'} aria-expanded={open} disabled={mode!==null} onClick={()=>setOpen(value=>!value)} className={`absolute inset-x-0 z-20 flex h-8 items-center justify-center gap-2 border-t bg-background/90 text-primary backdrop-blur-sm disabled:opacity-60 ${open?'bottom-16':'bottom-0'}`}>
   <span aria-hidden="true" className="size-1 rounded-full bg-primary"/><span className="text-[11px]">먹이 주기 · 청소하기</span>{open?<ChevronDown aria-hidden="true" className="size-3.5"/>:<ChevronUp aria-hidden="true" className="size-3.5"/>}
  </button>
  <Feeding tank={tank} blocked={!open||mode==='clean'} onActiveChange={active=>setMode(active?'feed':null)}/><Cleaning tank={tank} blocked={!open||mode==='feed'} onActiveChange={active=>setMode(active?'clean':null)}/>
 </>
}
