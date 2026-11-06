export const basicFarmBuildings=['warehouse','seedShop','store'] as const
export const isBasicFarmBuilding=(kind:string)=>basicFarmBuildings.some(building=>building===kind)
