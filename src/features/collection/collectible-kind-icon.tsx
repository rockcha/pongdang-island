import {appArt} from '@/components/app-art'
import type {CollectibleKind} from './api'
import {RelicIcon} from '@/components/collection-filter-icons'

export function CollectibleKindIcon({kind,className='size-6'}:{kind:CollectibleKind;className?:string}){
 if(kind==='decoration')return <img src="/app-icons/collection-decoration-v1.webp" alt="" aria-hidden className={className+' shrink-0 object-contain'} decoding="async"/>
 const Icon=kind==='relic'?RelicIcon:appArt[kind]
 return <Icon className={className}/>
}
