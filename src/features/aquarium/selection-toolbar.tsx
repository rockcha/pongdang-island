import type {ReactNode} from 'react'
import {MoreHorizontal,SlidersHorizontal,X} from 'lucide-react'
import {Button} from '@/components/ui/button'

export type SelectionPanel='customize'|'order'|'more'|null
export function SelectionToolbar({name,busy,panel,onPanel,onClose,children}:{name:string;busy:boolean;panel:SelectionPanel;onPanel:(panel:SelectionPanel)=>void;onClose:()=>void;children:ReactNode}){
  return <section aria-label={`${name} 선택 도구`} className="absolute inset-x-2 top-16 z-30 mx-auto flex w-auto max-w-sm flex-col-reverse overflow-hidden rounded-xl border border-white/50 bg-background/15 shadow-md">
    {panel&&<div className="flex flex-col items-center gap-1 border-t border-border/50 px-2 py-1.5">{children}</div>}
    <div className="flex min-h-12 items-center gap-1 bg-background/90 px-2">
      <span className="min-w-0 flex-1 truncate pl-1 text-xs font-medium" title={name}>{name}</span>
      <Button variant={panel==='customize'||panel==='order'?'secondary':'ghost'} className="min-h-11 gap-1 px-2 text-xs" aria-expanded={panel==='customize'||panel==='order'} disabled={busy} onClick={()=>onPanel(panel==='customize'||panel==='order'?null:'customize')}><SlidersHorizontal className="size-3.5"/>꾸미기</Button>
      <Button variant={panel==='more'?'secondary':'ghost'} size="icon" className="min-h-11 min-w-11" aria-label="개체 추가 메뉴" aria-expanded={panel==='more'} disabled={busy} onClick={()=>onPanel(panel==='more'?null:'more')}><MoreHorizontal className="size-4"/></Button>
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="개체 선택 닫기" disabled={busy} onClick={onClose}><X className="size-4"/></Button>
    </div>
  </section>
}
