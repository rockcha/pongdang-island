import {useEffect,useState} from 'react'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {ExpeditionResults} from './expedition-results'
import type {ExpeditionOutcome} from './api'

const sample:ExpeditionOutcome={attempted:5,failed:1,items:[
 {id:'preview-common',bonus:false,species:{id:'bean-pufferfish',name:'콩알 복어',thumbnail_path:'fish/normal/bean-pufferfish_thumbnail.png',rarity:'common'}},
 {id:'preview-rare',bonus:false,species:{id:'amber-lantern-snail',name:'호박등불 고둥',thumbnail_path:'fish/rare/amber-lantern-snail_thumbnail.png',rarity:'rare'}},
 {id:'preview-epic',bonus:false,species:{id:'amethyst-goblin-shark',name:'자수정 마귀상어',thumbnail_path:'fish/epic/amethyst-goblin-shark_thumbnail.png',rarity:'epic'}},
 {id:'preview-mythic',bonus:false,species:{id:'atlantean-sentinel',name:'아틀란티스 수호병',thumbnail_path:'fish/mythic/atlantean-sentinel_thumbnail.png',rarity:'mythic'}},
]}

/** Visual preview only. Never calls expedition actions or mutates inventory. */
export function TrapResultPreview(){
 const [open,setOpen]=useState(false),[remaining,setRemaining]=useState(10)
 useEffect(()=>{
  if(!open)return
  const deadline=Date.now()+10_000
  const timer=window.setInterval(()=>setRemaining(Math.max(0,Math.ceil((deadline-Date.now())/1000))),200)
  return()=>window.clearInterval(timer)
 },[open])
 return <>
  <Button variant="secondary" className="min-h-12 min-w-0 flex-1 rounded-xl px-2 text-xs" onClick={()=>{setRemaining(10);setOpen(true)}}>임시 통발 설치</Button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="flex max-h-[85dvh] max-w-sm flex-col gap-0 overflow-hidden rounded-2xl p-0">
   <DialogHeader className="shrink-0 p-4 pr-10"><DialogTitle className="text-base">임시 통발 · 결과 미리보기</DialogTitle><DialogDescription>미끼 소모와 실제 개체 지급이 없는 화면 테스트예요.</DialogDescription></DialogHeader>
   {remaining>0?<div role="status" className="space-y-4 px-4 py-8 text-center"><img src="/app-icons/fish-trap.png" alt="" className="mx-auto size-24 object-contain"/><p className="text-sm text-primary">통발을 확인하는 중 · {remaining}초</p><div role="progressbar" aria-label="임시 통발 진행" aria-valuemin={0} aria-valuemax={10} aria-valuenow={10-remaining} className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{width:`${(10-remaining)*10}%`}}/></div></div>:<div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4"><ExpeditionResults outcome={sample} preview/></div>}
   <Button className="mt-auto min-h-14 w-full shrink-0 rounded-none pb-[max(1rem,env(safe-area-inset-bottom))] pt-4" onClick={()=>setOpen(false)}>{remaining?'취소':'닫기'}</Button>
  </DialogContent></Dialog>
 </>
}
