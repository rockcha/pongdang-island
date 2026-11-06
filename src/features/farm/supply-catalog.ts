import type {TopviewState} from './topview-model'

export const farmSupplies={
 fertilizer:{name:'비료',price:80,image:'/farm/art/v27/supplies/fertilizer.png',description:'선택한 밭의 남은 재배 시간 50% 감소'},
 premiumFertilizer:{name:'고급 비료',price:250,image:'/farm/art/v27/supplies/premiumFertilizer.png',description:'선택한 밭의 작물을 즉시 수확 가능하게 성장'},
} as const
export type FarmSupply=keyof typeof farmSupplies
export const farmSupplyKinds=Object.keys(farmSupplies) as FarmSupply[]
export const isFarmSupply=(value:unknown):value is FarmSupply=>typeof value==='string'&&Object.hasOwn(farmSupplies,value)
export function withFarmSupplyInventory(state:TopviewState):TopviewState{
 if(farmSupplyKinds.every(kind=>state.simulation.inventory[kind]!==undefined))return state
 return {...state,simulation:{...state.simulation,inventory:{...state.simulation.inventory,fertilizer:state.simulation.inventory.fertilizer??0,premiumFertilizer:state.simulation.inventory.premiumFertilizer??0}}}
}
