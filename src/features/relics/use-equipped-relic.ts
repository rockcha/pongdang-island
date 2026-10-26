import {useAccountResource} from '@/lib/account-query'
import {readRelics} from './api'
export function useEquippedRelic(){
 const {data}=useAccountResource('relics',readRelics)
 return data?.relics.find(relic=>relic.id===data.equippedId)??null
}
