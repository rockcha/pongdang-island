export const biteConfirmationKey='pongdang:fishing:confirm-bite'
let temporary:boolean|undefined

export function readBiteConfirmation(){
 if(temporary!==undefined)return temporary
 try{return localStorage.getItem(biteConfirmationKey)!=='false'}catch{return true}
}

export function saveBiteConfirmation(enabled:boolean){
 try{localStorage.setItem(biteConfirmationKey,String(enabled));temporary=undefined;return true}catch{temporary=enabled;return false}
}
