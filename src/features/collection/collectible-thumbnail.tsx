import { useState } from 'react'
import { collectibleUrl } from './api'
export function CollectibleThumbnail({path,name,className='size-16'}:{path:string;name:string;className?:string}){
 const [failed,setFailed]=useState(false)
 return failed?<span role="img" aria-label={name} className={`${className} inline-flex items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground`}>준비 중</span>:<img src={collectibleUrl(path)} alt={name} className={`${className} object-contain`} onError={()=>setFailed(true)}/>
}
