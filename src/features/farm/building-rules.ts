export const basicFarmBuildings=['warehouse','seedShop','store'] as const
export const isBasicFarmBuilding=(kind:string)=>basicFarmBuildings.some(building=>building===kind)
export const WAREHOUSE_PURCHASE_LIMIT=3
// Starter warehouses keep their sale protection; additional copies share the purchase limit.
export const isFarmShopKind=(kind:string)=>kind==='warehouse'||!isBasicFarmBuilding(kind)
