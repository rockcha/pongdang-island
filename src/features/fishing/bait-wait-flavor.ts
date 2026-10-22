import {fishing_baits} from '../../../supabase/catalog/catalog.json'

export function baitWaitFlavor(id:string){
 return fishing_baits.find(bait=>bait.id===id)?.description??''
}
