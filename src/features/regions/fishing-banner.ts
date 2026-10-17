const horizonRegions=new Set(['pongdang','coral','mistmoon','starruins','dreamabyss','primal','bluegrove','whitenight','cloudferry','scrapisle'])

export function fishingBannerPath(regionId:string){
 return horizonRegions.has(regionId)?`/banners/${regionId}-horizon.png`:null
}
