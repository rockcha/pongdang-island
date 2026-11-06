import {cropKinds} from './crop-catalog'
import {deliverableGoods} from './food-catalog'
import {farmStorageUsage} from './farm-simulation'
import {WAREHOUSE_BASE_CAPACITY,WAREHOUSE_CAPACITY_PER_LEVEL} from './building-upgrades'
import {initialTopview} from './topview-model'

export const canUseFarmTrialStock=(operator:boolean,email?:string)=>operator&&email?.trim().toLowerCase()==='0@0.com'
export function initialFarmTrial(withStock=false){
 const state=initialTopview()
 if(!withStock)return state
 for(const good of [...cropKinds,...deliverableGoods])state.simulation.inventory[good]=Math.max(2,state.simulation.inventory[good])
 // Leave one extra shelf of space for harvesting and recipe testing.
 const level=1+Math.ceil(Math.max(0,farmStorageUsage(state.simulation)+WAREHOUSE_CAPACITY_PER_LEVEL-WAREHOUSE_BASE_CAPACITY)/WAREHOUSE_CAPACITY_PER_LEVEL)
 state.objects=state.objects.map(object=>object.kind==='warehouse'?{...object,level}:object)
 return state
}
