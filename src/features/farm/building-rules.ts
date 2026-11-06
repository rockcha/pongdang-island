export const basicFarmBuildings=['warehouse','office','livestockOffice','seedShop','store'] as const
export const isBasicFarmBuilding=(kind:string)=>basicFarmBuildings.some(building=>building===kind)
