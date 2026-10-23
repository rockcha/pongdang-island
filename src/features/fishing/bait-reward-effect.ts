import {fishing_baits} from '../../../supabase/catalog/catalog.json'

export const BAIT_RECEIVED='bait-received'
export type BaitRewardEffect={key:string;quantity:number;icon:string;name:string;startedAt:number}
/** Call only after an authoritative claim response, never from wallet refreshes or purchases. */
export function announceBaitReceived(key:string,baitId:string,quantity:number,startedAt=performance.now()){
 const bait=fishing_baits.find(b=>b.id===baitId)
 if(!bait||!Number.isSafeInteger(quantity)||quantity<=0||typeof window==='undefined')return
 window.dispatchEvent(new CustomEvent<BaitRewardEffect>(BAIT_RECEIVED,{detail:{key,quantity,icon:bait.image_path,name:bait.name,startedAt}}))
}
