import {farmWorkshops,isProcessingBuilding} from './workshop-catalog'
import type {FarmTool} from './topview-model'

// Keep artwork revisions explicit so old roof designs cannot return through nested sprites.
const artworkVersions:Partial<Record<FarmTool,'v1'|'v2'|'v3'|'v4'|'v19'|'v20'>>={
 livestockOffice:'v19',
 warehouse:'v19',office:'v19',seedShop:'v20',store:'v3',barn:'v19',coop:'v20',lab:'v3',mill:'v3',processed:'v19',
}
export function farmBuildingArtPath(kind:FarmTool){
 if(kind==='agriShop')return '/farm/art/v27/buildings/agriShop.png'
 if(kind==='seedShop')return '/farm/art/v24/buildings/seedShop.png'
 if(kind==='store')return '/farm/art/v26/buildings/store.png'
 if(kind==='butcher')return '/farm/art/v22/buildings/butcher.png'
 if(isProcessingBuilding(kind))return farmWorkshops[kind].image
 const version=artworkVersions[kind]
 return version?`/farm/art/${version}/buildings/${kind}.png`:null
}
