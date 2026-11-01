import {useState} from 'react'
import {History,LogOut,MoreHorizontal,Settings2} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {ExplorationSoundSettings} from './sound-settings'

export function ExplorationMenu({onHistory,onLeave,onPreview}:{onHistory:()=>void;onLeave:()=>void;onPreview:()=>void}){
 const [open,setOpen]=useState(false)
 const [sound,setSound]=useState(false)
 return <>
  <button className="exploration-menu-trigger" aria-label="탐험 메뉴" aria-expanded={open} onClick={()=>setOpen(true)}><MoreHorizontal size={21}/></button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="exploration-modal exploration-run-menu"><DialogHeader><DialogTitle>탐험 메뉴</DialogTitle><DialogDescription>소리 설정과 기록을 확인하거나 탐험을 나갈 수 있어요.</DialogDescription></DialogHeader>
   <div className="exploration-menu-actions"><button aria-label="탐험 소리 설정" onClick={()=>{setOpen(false);setSound(true)}}><Settings2 size={18}/>소리 설정</button><button onClick={()=>{setOpen(false);onHistory()}}><History size={18}/>탐험 기록</button><button onClick={()=>{setOpen(false);onLeave()}}><LogOut size={18}/>탐험 나가기</button></div>
  </DialogContent></Dialog>
  <ExplorationSoundSettings hideTrigger open={sound} onOpenChange={setSound} onPreview={onPreview}/>
 </>
}
