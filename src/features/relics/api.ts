import {createClient} from '@/lib/client'
import type {Rarity} from '@/lib/game/rarity'

export type Relic={id:string;name:string;description:string;rarity:Rarity;thumbnail_path:string;owned:boolean;discovered?:boolean;sell_price:number;effect_kind:string;effect_value:number}
export type RelicState={equippedId:string|null;changeFee:number;relics:Relic[];replayed?:boolean}
export async function loadRelics(){
 const {data,error}=await createClient().rpc('relic_state')
 if(error)throw error
 return data
}
export async function equipRelic(id:string|null,operation:string,fee:number){
 const {data,error}=await createClient().rpc('equip_relic',{p_relic_id:id,p_operation_id:operation,p_expected_fee:fee})
 if(error)throw error
 window.dispatchEvent(new Event('wallet-changed'))
 window.dispatchEvent(new Event('relic-loadout-changed'))
 return data
}
export async function sellRelic(id:string,operation:string,price:number){
 const {data,error}=await createClient().rpc('sell_relic',{p_relic_id:id,p_operation_id:operation,p_expected_price:price})
 if(error)throw error
 window.dispatchEvent(new Event('wallet-changed'))
 window.dispatchEvent(new Event('relic-loadout-changed'))
 return data
}
export function relicError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 if(message.includes('RELIC_EQUIPPED'))return '장착 중인 유물은 먼저 해제한 뒤 판매해 주세요.'
 if(message.includes('RELIC_PRICE_CHANGED'))return '판매 가격이 바뀌었어요. 현재 가격을 다시 확인해 주세요.'
 if(message.includes('RELIC_NOT_SELLABLE'))return '지금은 판매할 수 없는 유물이에요.'
 if(message.includes('GOLD_LIMIT'))return '보유 가능한 골드를 초과해 판매할 수 없어요.'
 if(message.includes('RELIC_LOADOUT_CHANGED'))return '다른 곳에서 장착 상태가 바뀌었어요. 현재 상태와 비용을 다시 확인해 주세요.'
 if(message.includes('INSUFFICIENT_GOLD'))return '골드가 부족해요.'
 if(message.includes('RELIC_NOT_OWNED'))return '발견한 유물만 장착할 수 있어요.'
 if(message.includes('RELIC_ALREADY_EQUIPPED'))return '이미 같은 장착 상태예요. 다시 확인해 주세요.'
 if(message.includes('OPERATION_CONFLICT'))return '이전 요청과 내용이 달라요. 장착 상태를 다시 확인해 주세요.'
 return '장착 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.'
}
