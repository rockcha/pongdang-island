const key=(userId:string)=>`pongdang:last-bait:${userId}`
export function readLastBait(userId:string){
 try{return localStorage.getItem(key(userId))||'bait'}catch{return 'bait'}
}
export function saveLastBait(userId:string,baitId:string){
 try{localStorage.setItem(key(userId),baitId)}catch{/* Selection still works when storage is unavailable. */}
}
