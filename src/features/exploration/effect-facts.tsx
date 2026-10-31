import type {ReactNode} from 'react'
import './effect-facts.css'
export type EffectFact={label:string;value:string;icon:ReactNode;note?:string;tone?:'health'|'mana'|'danger'|'gold'}
export function EffectFacts({items,label='효과'}:{items:EffectFact[];label?:string}){
 return <dl className="exploration-effect-facts" aria-label={label}>{items.map((item,index)=><div key={index} data-tone={item.tone}><dt>{item.icon}<span>{item.label}</span></dt><dd>{item.value}</dd>{item.note&&<small>{item.note}</small>}</div>)}</dl>
}
