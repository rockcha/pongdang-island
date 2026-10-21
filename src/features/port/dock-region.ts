const key=(userId:string,slot:number)=>`pongdang:harbor-region:${userId}:${slot}`

export function readDockRegion(userId:string,slot:number|null,regions:{id:string;unlocked:boolean}[]){
 let saved:string|null=null
 try{if(slot)saved=localStorage.getItem(key(userId,slot))}catch{/* Storage can be disabled. */}
 return regions.find(region=>region.unlocked&&region.id===saved)?.id
  ??regions.find(region=>region.unlocked&&region.id==='pongdang')?.id
  ??regions.find(region=>region.unlocked)?.id??'pongdang'
}

export function rememberDockRegion(userId:string,slot:number|null,regionId:string){
 try{if(slot)localStorage.setItem(key(userId,slot),regionId)}catch{/* Departure remains usable without storage. */}
}
