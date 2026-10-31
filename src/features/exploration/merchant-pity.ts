import type {PracticeState} from './practice-state'
import type {ShopkeeperId} from './shopkeepers'
export const supplyCheckFloors=[11,21,31,41] as const
export function queueForcedMerchant(state:PracticeState):PracticeState{
 const floor=state.market.floor
 if(state.mode!=='practice'||!supplyCheckFloors.some(level=>level===floor)||state.forcedMerchant||state.supplyChecks?.includes(floor))return state
 const checked={...state,supplyChecks:[...(state.supplyChecks??[]),floor]}
 if(state.equipmentMerchantVisits?.some(level=>level>=floor-10&&level<floor))return checked
 const id:ShopkeeperId=floor===11?'hasan':floor===41?'zahir':'karim'
 return {...checked,forcedMerchant:{floor,id,phase:'pending'}}
}
export function finishForcedMerchant(state:PracticeState):PracticeState{
 if(state.forcedMerchant?.phase!=='active')return state
 return {...state,forcedMerchant:undefined}
}
