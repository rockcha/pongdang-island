import type {FarmTool} from './topview-model'

// Keep artwork revisions explicit so old roof designs cannot return through nested sprites.
const artworkVersions:Partial<Record<FarmTool,'v1'|'v2'|'v3'|'v4'>>={
 livestockOffice:'v4',kitchen:'v4',
 warehouse:'v3',office:'v3',seedShop:'v3',store:'v3',barn:'v3',coop:'v3',lab:'v3',mill:'v3',processed:'v3',dairy:'v3',bakery:'v3',
}
export function farmBuildingArtPath(kind:FarmTool){
 const version=artworkVersions[kind]
 return version?`/farm/art/${version}/buildings/${kind}.png`:null
}
