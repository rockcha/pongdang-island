import {nyamnyamArt} from './nyamnyam-art'
import {plunderArt} from './plunder-art'
import {mechsanctumArt} from './mechsanctum-art'
import {fireflyArt} from './firefly-art'
const horizonRegions=new Set(['siren','mukhyang','pongdang','coral','mistmoon','starruins','dreamabyss','primal','bluegrove','whitenight','cloudferry','scrapisle'])

export function fishingBannerPath(regionId:string){
 if(regionId==='firefly')return fireflyArt.banner
 if(regionId==='mechsanctum')return mechsanctumArt.banner
 if(regionId==='nyamnyam')return nyamnyamArt.banner
 if(regionId==='plunder')return plunderArt.banner
 return horizonRegions.has(regionId)?`/banners/${regionId}-horizon.png`:null
}
