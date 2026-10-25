import {appArt} from '@/components/app-art'
import type {CollectibleKind} from './api'
import {RelicIcon} from '@/components/collection-filter-icons'

export function CollectibleKindIcon({kind,className='size-6'}:{kind:CollectibleKind;className?:string}){
 const Icon=kind==='relic'?RelicIcon:appArt[kind]
 return <Icon className={className}/>
}
