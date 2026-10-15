import { useRef } from 'react'
import type { ReactElement,ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger } from '@/components/ui/alert-dialog'

type Props={
 open:boolean
 onOpenChange:(open:boolean)=>void
 title:string
 description:ReactNode
 onConfirm:()=>void
 trigger?:ReactElement
 busy?:boolean
 confirmDisabled?:boolean
 error?:string
 children?:ReactNode
}

/** Shared Pongi confirmation. The caller closes it only after a successful action. */
export function ConfirmDialog({open,onOpenChange,title,description,onConfirm,trigger,busy=false,confirmDisabled=false,error,children}:Props){
 const cancel=useRef<HTMLButtonElement>(null)
 return <AlertDialog open={open} onOpenChange={next=>{if(!busy)onOpenChange(next)}}>
  {trigger&&<AlertDialogTrigger render={trigger}/>}
  <AlertDialogContent size="sm" initialFocus={cancel} className="max-h-[85dvh] w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-3xl p-6 text-center ring-foreground/5 shadow-sm">
   <img src="/branding/pongi-curious.png" alt="" width={112} height={112} className="mx-auto mb-4 size-28 shrink-0 object-contain"/>
   <AlertDialogHeader className="gap-2">
    <AlertDialogTitle className="text-base font-semibold leading-6 text-balance">{title}</AlertDialogTitle>
    <AlertDialogDescription className="text-xs leading-5 text-pretty">{description}</AlertDialogDescription>
   </AlertDialogHeader>
   {children&&<div className="mt-5 text-left">{children}</div>}
   {error&&<p role="alert" className="mt-3 text-xs leading-5 text-destructive">{error}</p>}
   <div className="mt-6 grid grid-cols-2 gap-2.5">
    <AlertDialogCancel ref={cancel} variant="secondary" className="min-h-11 rounded-xl border-0" disabled={busy}>취소</AlertDialogCancel>
    <Button className="min-h-11 rounded-xl" disabled={busy||confirmDisabled} aria-busy={busy} onClick={()=>{if(!busy&&!confirmDisabled)onConfirm()}}>{busy?'처리 중…':'확인'}</Button>
   </div>
  </AlertDialogContent>
 </AlertDialog>
}
