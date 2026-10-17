import {readFileSync,writeFileSync} from 'node:fs'
const path='supabase/catalog/catalog.json',c=JSON.parse(readFileSync(path,'utf8'))
c.regions.push({id:'whitenight',name:'백야의 빙해',description:'해가 지지 않는 옅은 금빛 하늘 아래, 푸른 빙벽과 유빙 사이로 맑은 물길이 이어져요.',rarity:'common',sort_order:8,image_path:'whitenight.png',requires_map_fragment:true})
c.regions.sort((a,b)=>a.id.localeCompare(b.id))
c.region_maps.push({region_id:'whitenight',price:3500,thumbnail_path:'map/routes/map-whitenight_thumbnail.png'})
c.region_maps.sort((a,b)=>a.region_id.localeCompare(b.region_id))
for(const s of c.collectible_species.filter(s=>!s.native_region_id&&s.kind!=='map'))c.collectible_habitats.push({species_id:s.id,region_id:'whitenight'})
c.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
writeFileSync(path,JSON.stringify(c,null,2)+'\n')
