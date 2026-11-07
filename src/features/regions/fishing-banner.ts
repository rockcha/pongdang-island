import {nyamnyamArt} from './nyamnyam-art'
import {plunderArt} from './plunder-art'
import {mechsanctumArt} from './mechsanctum-art'
import {fireflyArt} from './firefly-art'
import {pharaohArt} from './pharaoh-art'
import {hangangArt} from './hangang-art'
import {galaxyArt} from './galaxy-art'
import {hologramArt} from './hologram-art'
const horizonRegions=new Set(['siren','mukhyang','pongdang','coral','mistmoon','starruins','dreamabyss','primal','bluegrove','whitenight','cloudferry','scrapisle'])

export function fishingBannerPath(regionId:string){
 if(regionId==='hologram')return hologramArt.banner
 if(regionId==='galaxy')return galaxyArt.banner
 if(regionId==='hangang')return hangangArt.banner
 if(regionId==='pharaoh')return pharaohArt.banner
 if(regionId==='firefly')return fireflyArt.banner
 if(regionId==='mechsanctum')return mechsanctumArt.banner
 if(regionId==='nyamnyam')return nyamnyamArt.banner
 if(regionId==='plunder')return plunderArt.banner
 return horizonRegions.has(regionId)?`/banners/${regionId}-horizon.png`:null
}
