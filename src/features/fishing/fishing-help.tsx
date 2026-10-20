import { createPortal } from 'react-dom'
import { Info, MousePointer2, Waves, Fish } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function FishingHelp({open,onOpenChange,toolbarTarget}:{toolbarTarget?:HTMLElement|null;open:boolean;onOpenChange:(open:boolean)=>void}){
 return <Dialog open={open} onOpenChange={onOpenChange}>
  {toolbarTarget?createPortal(<div className="order-40">   <TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" aria-label="낚시 도움말" className="size-11 rounded-full border border-white/20 bg-slate-950/20 text-white backdrop-blur-sm hover:bg-slate-950/35 hover:text-white"/>}/>}><Info className="size-5"/></TooltipTrigger><TooltipContent>낚시 도움말</TooltipContent></Tooltip></TooltipProvider>
</div>,toolbarTarget):<div className="absolute right-3 top-3 z-20">   <TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" aria-label="낚시 도움말" className="size-11 rounded-full border border-white/20 bg-slate-950/20 text-white backdrop-blur-sm hover:bg-slate-950/35 hover:text-white"/>}/>}><Info className="size-5"/></TooltipTrigger><TooltipContent>낚시 도움말</TooltipContent></Tooltip></TooltipProvider>
</div>}
  <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-md">
   <DialogHeader className="text-left"><DialogTitle>바다와 밀고 당기기</DialogTitle><DialogDescription>입질을 기다리고, 물고기의 힘에 맞춰 버텨보세요.</DialogDescription></DialogHeader>
   <div className="space-y-5 py-2">
    <section className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><Fish className="size-4"/></span><div><h3 className="text-sm font-semibold">그림자가 다가오면</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">찌를 툭툭 건드리는 입질 뒤 물고기가 당기기 시작해요. 높은 등급일수록 더 오래, 여러 번 당겨요. 힘을 푸는 휴식은 1.5~3초예요.</p></div></section>
    <section className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><MousePointer2 className="size-4"/></span><div><h3 className="text-sm font-semibold">꾹 눌러 버티고, 떼어서 쉬어요</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">릴을 누르면 게이지가 차고, 물고기가 당기면 내려가요. 너무 높아지면 손을 떼세요. 컴퓨터에서는 스페이스바로 시작하고, 꾹 눌러 당기고 떼어서 쉬어요. 릴에 포커스를 두면 Enter도 사용할 수 있어요.</p></div></section>
    <section className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Waves className="size-4"/></span><div><h3 className="text-sm font-semibold">게이지는 가운데를 지켜요</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">20~85 사이를 유지해보세요. 95 이상이 0.8초 이어지면 줄이 끊어지고, 0이 0.8초 이어지면 줄이 느슨해져 놓쳐요.</p></div></section>
   </div>
   <div className="rounded-2xl bg-muted/70 p-4 text-xs leading-6 text-muted-foreground"><p>낚시는 시작할 때 미끼 1개를 사용해요. 취소하거나 실패해도 돌려받지 않아요.</p><p className="mt-1">미끼에 따라 낚시 성공 확률이 달라져요. 이슬잎 경단은 성공 판정이 보장되지만 게이지 조작은 직접 해야 해요. 어느 미끼든 끝까지 버텨야 잡을 수 있어요. 입질만 하고 떠나는 물고기는 힘 조절과 관계없는 도주예요.</p><p className="mt-1">도움말을 읽는 동안 낚시 동작은 잠시 멈춰요. 실제 낚시 예약은 시작 후 3분이 지나면 만료돼요.</p></div>
   <Button className="min-h-11 rounded-xl" onClick={()=>onOpenChange(false)}>알겠어요</Button>
  </DialogContent>
 </Dialog>
}
