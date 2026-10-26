import {nyamnyamArt} from './nyamnyam-art'
import {plunderArt} from './plunder-art'
const horizonRegions=new Set(['siren','mukhyang','pongdang','coral','mistmoon','starruins','dreamabyss','primal','bluegrove','whitenight','cloudferry','scrapisle'])

export function fishingBannerPath(regionId:string){
 if(regionId==='nyamnyam')return nyamnyamArt.banner
 if(regionId==='plunder')return plunderArt.banner
 return horizonRegions.has(regionId)?`/banners/${regionId}-horizon.png`:null
}
