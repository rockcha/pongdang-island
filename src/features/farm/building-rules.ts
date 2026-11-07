export const basicFarmBuildings=['warehouse','seedShop','store'] as const
export const isBasicFarmBuilding=(kind:string)=>basicFarmBuildings.some(building=>building===kind)
export const WAREHOUSE_PURCHASE_LIMIT=2
// Starter warehouses keep their sale protection, but one additional copy can be bought.
export const isFarmShopKind=(kind:string)=>kind==='warehouse'||!isBasicFarmBuilding(kind)
