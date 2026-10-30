import {useLayoutEffect,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {MoreHorizontal,X} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {rarities} from '@/lib/game/rarity'
import type {Rarity} from '@/lib/game/rarity'

export type SelectionPanel='customize'|'order'|'more'|null
export function SelectionToolbar({name,rarity,busy,panel,onPanel,onClose,children,topOffset,wide=false,anchor,bounds,hidden=false}:{name:string;rarity:Rarity;busy:boolean;panel:SelectionPanel;onPanel:(panel:SelectionPanel)=>void;onClose:()=>void;children:ReactNode;topOffset?:number;wide?:boolean;anchor?:{x:number;y:number};bounds?:{width:number;height:number};hidden?:boolean}){
  const ref=useRef<HTMLElement>(null)
  const [height,setHeight]=useState(220)
  useLayoutEffect(()=>{const element=ref.current;if(!element)return;const measure=()=>{if(element.offsetHeight)setHeight(element.offsetHeight)};measure();if(typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect()},[])
  const width=Math.min(272,(bounds?.width??320)-16)
  const side=anchor&&bounds&&anchor.x+width+40>bounds.width?'left':'right'
  const left=anchor&&bounds?Math.max(8,Math.min(bounds.width-width-8,side==='right'?anchor.x+36:anchor.x-width-36)):8
  const top=anchor&&bounds?Math.max(76,Math.min(bounds.height-height-8,anchor.y-height/2)):topOffset
  return <section ref={ref} hidden={hidden} data-wide-side={wide?side:undefined} aria-label={`${name} 선택 도구`} style={wide?{left,top,width}:{top:topOffset}} className={`${wide?'aquarium-wide-selection ':''}absolute inset-x-2 top-16 z-30 mx-auto flex w-auto max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-background shadow-md`}>

    <div className="flex min-h-12 items-center gap-1 bg-background/90 px-2">
      <span className="flex min-w-0 flex-1 items-center gap-1.5 pl-1 text-xs font-medium" title={name}><span role="img" aria-label={`${rarities[rarity].label} 등급`} title={rarities[rarity].label} className="size-1.5 shrink-0 rounded-full" style={{backgroundColor:rarities[rarity].effectColor}}/><span className="truncate">{name}</span></span>
      <Button variant={panel==='more'?'secondary':'ghost'} size="icon" className="min-h-11 min-w-11" aria-label="개체 추가 메뉴" aria-expanded={panel==='more'} disabled={busy} onClick={()=>onPanel(panel==='more'?'customize':'more')}><MoreHorizontal className="size-4"/></Button>
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="개체 선택 닫기" disabled={busy} onClick={onClose}><X className="size-4"/></Button>
    </div>
    {<div className="aquarium-selection-body flex flex-col gap-1 border-t border-border/50 px-2 py-1.5">{children}</div>}
  </section>
}
