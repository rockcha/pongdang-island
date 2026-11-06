import {farmPlacementTerrain,type FarmTool} from './topview-model'

export const buildingShopCategories=['전체','농업','축산','가공','요리','생활용품'] as const
export const decorationShopCategories=['전체','자연','울타리·시설','캐릭터','물 위 장식','다리'] as const
export type ShopCategory=typeof buildingShopCategories[number]|typeof decorationShopCategories[number]

export function farmShopCategory(kind:FarmTool,tab:'건물'|'꾸미기'):ShopCategory{
 if(tab==='건물'){
  if(kind==='textileMill'||kind==='sewingWorkshop')return '생활용품'
  if(['office','lab','agriShop','waterwheel','seedShop'].includes(kind))return '농업'
  if(['barn','coop','livestockOffice','apiary','butcher'].includes(kind))return '축산'
  if(['bakery','mediumBakery','kitchen','advancedKitchen'].includes(kind))return '요리'
  return '가공'
 }
 if(kind.startsWith('woodBridge'))return '다리'
 if(farmPlacementTerrain(kind)==='sea')return '물 위 장식'
 if(['flowers','rabbitTopiary'].includes(kind))return '자연'
 if(['teacupCat','bearPicnic','chickSandbox'].includes(kind))return '캐릭터'
 return '울타리·시설'
}
