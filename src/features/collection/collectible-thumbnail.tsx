import { useState } from 'react'
import { collectibleUrl } from './api'
import type {Species} from './api'
import {NativeRegionBadge} from './native-region-badge'
export function CollectibleThumbnail({path,name,className='size-16',species,fadeIn=false}:{path:string;name:string;className?:string;fadeIn?:boolean;species?:Pick<Species,'is_native'|'native_region_id'>}){
 const [failedPath,setFailedPath]=useState<string|null>(null)
 const [loadedPath,setLoadedPath]=useState<string|null>(null)
 const failed=failedPath===path
 const loaded=loadedPath===path
 return <span className={`${className} relative inline-flex shrink-0`} aria-busy={fadeIn&&!loaded&&!failed}>{fadeIn&&!loaded&&!failed&&<span aria-hidden="true" className="absolute inset-0 rounded-lg bg-secondary/50 motion-safe:animate-pulse"/>}{failed?<span role="img" aria-label={name} className="inline-flex size-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">준비 중</span>:<img src={collectibleUrl(path)} alt={name} className={"size-full object-contain "+(fadeIn?"transition-opacity duration-150 motion-reduce:transition-none "+(loaded?"opacity-100":"opacity-0"):"")} ref={image=>{if(fadeIn&&image?.complete&&image.naturalWidth>0)setLoadedPath(path)}} onLoad={()=>setLoadedPath(path)} onError={()=>setFailedPath(path)}/>}{species&&<NativeRegionBadge species={species}/>}</span>
}
