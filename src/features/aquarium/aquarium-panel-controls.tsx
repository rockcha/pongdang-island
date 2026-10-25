import {useEffect,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {ChevronDown,Search} from 'lucide-react'
import {Button} from '@/components/ui/button'
import './aquarium-wide.css'

export function AquariumSearchToggle({open,onChange,active=false}:{open:boolean;onChange:(open:boolean)=>void;active?:boolean}){
 return <Button variant="ghost" size="icon" className="aquarium-search-toggle" aria-label={open?'검색 접기':'검색 열기'} aria-expanded={open} data-active={active} onClick={event=>{
  const dialog=event.currentTarget.closest('[role="dialog"]')
  onChange(!open)
  if(!open)requestAnimationFrame(()=>dialog?.querySelector<HTMLInputElement>('input[type="search"]')?.focus({preventScroll:true}))
 }}><Search className="size-4"/></Button>
}

/** Share selection actions across compact storage and the wide aquarium panel. */
export function AquariumSelectionMenu({children}:{children:ReactNode}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  if(!open)return
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)}
  document.addEventListener('pointerdown',outside)
  return()=>document.removeEventListener('pointerdown',outside)
 },[open])
 return <div ref={root} className="aquarium-selection-menu" data-open={open} onKeyDown={event=>{if(open&&event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);root.current?.querySelector<HTMLButtonElement>('.aquarium-selection-toggle')?.focus()}}}>
  <Button variant="ghost" size="sm" className="aquarium-selection-toggle" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>전체 선택<ChevronDown className="size-3"/></Button>
  <div className="aquarium-selection-options" onClick={event=>{if((event.target as HTMLElement).closest('button')){setOpen(false);if(open)root.current?.querySelector<HTMLButtonElement>('.aquarium-selection-toggle')?.focus()}}}>{children}</div>
 </div>
}
