import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {PetGold} from './pet-jobs-panel'
import type {PreviewPet} from './pet-preview-model'

export type PetJobCompletion = {pet:PreviewPet;reward:number;jobName:string}
export function PetJobCompletionDialog({receipt,onClose}:{receipt:PetJobCompletion|null;onClose:()=>void}){
 return <Dialog open={!!receipt} onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="max-w-sm gap-5 rounded-2xl p-6 text-center">
  <DialogTitle>아르바이트 완료</DialogTitle>
  <DialogDescription>{receipt?.jobName}에서 돌아왔어요.</DialogDescription>
  {receipt&&<>
   <div className="flex flex-col items-center gap-2"><img src={`/pets/${receipt.pet.speciesId}_v1_thumbnail.png`} alt={receipt.pet.name} className="size-28 object-contain"/><strong className="text-base">{receipt.pet.name}</strong></div>
   <div className="rounded-xl bg-secondary/60 py-4"><p className="mb-1 text-xs text-muted-foreground">받은 보상</p><strong className="inline-flex text-2xl text-primary"><PetGold value={receipt.reward}/></strong></div>
   <div className="grid grid-cols-2 gap-5 text-left">{([{label:'포만도',value:receipt.pet.fullness,color:'#dfa46f'},{label:'애정',value:receipt.pet.affection,color:'#db8fa9'}]).map(g=><div key={g.label}><div className="mb-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">{g.label}</span><span className="tabular-nums">{g.value}<small className="text-muted-foreground"> / 100</small></span></div><div role="meter" aria-label={`돌아온 펫 ${g.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.value} className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full" style={{width:`${g.value}%`,backgroundColor:g.color}}/></div></div>)}</div>
   <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-primary text-sm text-primary-foreground">확인</button>
  </>}
 </DialogContent></Dialog>
}
