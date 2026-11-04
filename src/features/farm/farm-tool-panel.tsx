import type {ReactNode} from 'react'
import {Check} from 'lucide-react'

export function FarmToolPanel({id,label,title,description,onDone,children,content}:{id:string;label:string;title:string;description:string;onDone:()=>void;children?:ReactNode;content?:ReactNode}){
 return <section id={id} className="farm-tool-panel" aria-label={label}>
  <header><div><strong>{title}</strong><p>{description}</p></div><button className="farm-tool-done" onClick={onDone}><Check size={16}/><span>완료</span></button></header>
  {children&&<div className="farm-tool-menu">{children}</div>}
  {content}
 </section>
}
