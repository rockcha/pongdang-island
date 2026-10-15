import { Shell,Fish,Map } from 'lucide-react'
import type { CollectibleKind } from './api'

// Fixed category symbols. Trash depicts a crumpled piece of discarded paper, not a bin.
export function CollectibleKindIcon({kind,className='size-4'}:{kind:CollectibleKind;className?:string}){
 if(kind==='trash')return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 3 7 1 5-1 3 7-2 10-8 1-8-4 1-8Z"/><path d="m6 3 3 7-5-1m5 1 6-3 6 3M9 10l3 6-9 1m9-1 7 4m-4-13-3 9"/></svg>
 const Icon={fish:Fish,decoration:Shell,map:Map}[kind]
 return <Icon className={className} aria-hidden="true"/>
}
