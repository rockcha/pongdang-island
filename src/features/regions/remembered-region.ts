const storageKey=(userId?:string)=>`pongdang:harbor-region:${userId??'guest'}`

export function rememberRegion(regionId:string,userId?:string){
 try{localStorage.setItem(storageKey(userId),regionId)}catch{/* Map navigation still works without storage. */}
}

export function rememberedRegionIndex(regions:readonly {id:string}[],currentRegion:string,userId?:string){
 let saved:string|null=null
 try{saved=localStorage.getItem(storageKey(userId))}catch{}
 for(const id of [saved,currentRegion,'pongdang']){
  const index=regions.findIndex(region=>region.id===id)
  if(index>=0)return index
 }
 return 0
}
