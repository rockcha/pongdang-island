import {useState} from 'react'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {TopviewArt} from './topview-art'
import {topviewItems,type FarmTool,type TopviewState} from './topview-model'

export function FarmObjectStorage({state,onClose,onPlace}:{state:TopviewState;onClose:()=>void;onPlace:(kind:FarmTool)=>void}){
 const [tab,setTab]=useState('전체'),kinds=[...new Set(state.stored)].filter(kind=>tab==='전체'||topviewItems[kind].group===tab)
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="farm-sim-dialog"><DialogHeader><DialogTitle>보관함 <small> {state.stored.length}개</small></DialogTitle><DialogDescription>동물·건물·장식을 보관하고 원하는 곳에 다시 배치해요. 생산물은 창고에 보관해요.</DialogDescription></DialogHeader>
  <div className="farm-storage-tabs">{['전체','동물','건물','꾸미기'].map(group=><button key={group} aria-pressed={tab===group} onClick={()=>setTab(group)}>{group==='꾸미기'?'장식':group}</button>)}</div>
  <div className="farm-storage-list">{kinds.map(kind=><button key={kind} onClick={()=>onPlace(kind)}><span><TopviewArt kind={kind}/></span><div><strong>{topviewItems[kind].name}</strong><small>보관 {state.stored.filter(k=>k===kind).length}개</small></div><b>배치하기</b></button>)}</div>
  {!kinds.length&&<p className="farm-storage-empty">보관 중인 개체가 없어요.</p>}
 </DialogContent></Dialog>
}
