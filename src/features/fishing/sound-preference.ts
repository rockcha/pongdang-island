export const fishingSoundKey='pongdang:fishing:sound-enabled'
export const fishingSoundChanged='fishing-sound-changed'
let temporary:boolean|undefined

export function readFishingSound(){
 if(temporary!==undefined)return temporary
 try{return localStorage.getItem(fishingSoundKey)!=='false'}catch{return true}
}

export function saveFishingSound(enabled:boolean){
 let saved=true
 try{localStorage.setItem(fishingSoundKey,String(enabled));temporary=undefined}catch{temporary=enabled;saved=false}
 window.dispatchEvent(new Event(fishingSoundChanged))
 return saved
}
