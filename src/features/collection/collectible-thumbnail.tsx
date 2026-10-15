import { useState } from 'react'
import { collectibleUrl } from './api'
import type {Species} from './api'
import {NativeRegionBadge} from './native-region-badge'
export function CollectibleThumbnail({path,name,className='size-16',species}:{path:string;name:string;className?:string;species?:Pick<Species,'is_native'|'native_region_id'>}){
 const [failed,setFailed]=useState(false)
 return <span className={`${className} relative inline-flex shrink-0`}>{failed?<span role="img" aria-label={name} className="inline-flex size-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">준비 중</span>:<img src={collectibleUrl(path)} alt={name} className="size-full object-contain" onError={()=>setFailed(true)}/>}{species&&<NativeRegionBadge species={species}/>}</span>
}
