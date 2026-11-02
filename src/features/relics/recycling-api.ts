import {createClient} from '@/lib/client'
import {accountCommand} from '@/lib/account-command'
import type {RelicState} from './api'
export type RelicMaterial={id:string;quantity:number}
export type RelicRecyclingRequest={action:'recombine'|'dismantle';inputs:RelicMaterial[];operation:string}
export type RelicRecyclingResult={action:RelicRecyclingRequest['action'];cost:0;consumed:RelicMaterial[];receivedIds:string[];unequipped:boolean}
export function recycleRelics(request:RelicRecyclingRequest){
 return accountCommand(async()=>{
  const {data,error}=await createClient().rpc('recycle_relics',{p_action:request.action,p_inputs:request.inputs,p_operation_id:request.operation})
  if(error)throw error
  if(!data?.recycling||data.recycling.action!==request.action||!Array.isArray(data.recycling.receivedIds))throw Error('INVALID_RECYCLING_RECEIPT')
  return data as RelicState&{recycling:RelicRecyclingResult}
 },{resource:'relics',invalidate:['collection','titles'],event:'relic-loadout-changed'})
}
