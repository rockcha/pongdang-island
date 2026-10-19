import { useRef } from 'react'
import type { ReactElement,ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger } from '@/components/ui/alert-dialog'

type Props={
 illustration?:'dispatch'|'return'|'purchase'|'sale'|'game'|'savings'|'publish'|'caution'|'aquarium'|'boost'|'unfriend'|'fishing-leave'
 open:boolean
 onOpenChange:(open:boolean)=>void
 title:ReactNode
 description:ReactNode
 onConfirm:()=>void
 trigger?:ReactElement
 busy?:boolean
 confirmDisabled?:boolean
 error?:string
 children?:ReactNode
 confirmLabel?:string
 cancelLabel?:string
}

/** Shared Pongi confirmation. The caller closes it only after a successful action. */
export function ConfirmDialog({open,onOpenChange,title,description,onConfirm,trigger,busy=false,confirmDisabled=false,error,children,illustration='caution',confirmLabel='확인',cancelLabel='취소'}:Props){
 const cancel=useRef<HTMLButtonElement>(null)
 return <AlertDialog open={open} onOpenChange={next=>{if(!busy)onOpenChange(next)}}>
  {trigger&&<AlertDialogTrigger render={trigger}/>}
  <AlertDialogContent size="sm" initialFocus={cancel} className="pongi-confirm max-h-[85dvh] w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-[10px] border p-6 text-center shadow-sm">
   <img src={`/branding/confirm/pongi-${illustration}.png`} alt="" width={160} height={160} className="mx-auto mb-4 size-40 shrink-0 object-contain"/>
   <AlertDialogHeader className="gap-2">
    <AlertDialogTitle className="text-base font-normal leading-7 text-balance">{title}</AlertDialogTitle>
    <AlertDialogDescription className="text-xs leading-5 text-pretty">{description}</AlertDialogDescription>
   </AlertDialogHeader>
   {children&&<div className="mt-5 text-left">{children}</div>}
   {error&&<p role="alert" className="mt-3 text-xs leading-5 text-destructive">{error}</p>}
   <div className="mt-6 grid grid-cols-2 gap-2.5">
    <AlertDialogCancel ref={cancel} variant="secondary" className="min-h-11 rounded-xl border-0" disabled={busy}>{cancelLabel}</AlertDialogCancel>
    <Button className="min-h-11 rounded-xl" disabled={busy||confirmDisabled} aria-busy={busy} onClick={()=>{if(!busy&&!confirmDisabled)onConfirm()}}>{busy?'처리 중…':confirmLabel}</Button>
   </div>
  </AlertDialogContent>
 </AlertDialog>
}
