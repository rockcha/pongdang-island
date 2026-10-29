import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {Relic} from './api'

export function RelicArtwork({relic,className='',name= relic.name}:{relic:Pick<Relic,'name'|'thumbnail_path'|'attached'>;className?:string;name?:string}){
 return <span className={`relative inline-block shrink-0 ${className}`}>
  <CollectibleThumbnail path={relic.thumbnail_path} name={name} className="size-full"/>
  {relic.attached&&<span className="absolute -bottom-1 -right-1 size-[42%] rounded-full border border-primary/40 bg-background p-0.5 shadow-sm"><CollectibleThumbnail path={relic.attached.thumbnail_path} name={`결합 유물: ${relic.attached.name}`} className="size-full"/></span>}
 </span>
}
