import {appArt} from '@/components/app-art'
import type {CollectibleKind} from './api'

export function CollectibleKindIcon({kind,className='size-6'}:{kind:CollectibleKind;className?:string}){
 const Icon=appArt[kind]
 return <Icon className={className}/>
}
