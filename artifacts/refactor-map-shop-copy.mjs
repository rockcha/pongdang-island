import {readFileSync,writeFileSync} from 'node:fs'
const p='src/pages/harbor-page.tsx'
let s=readFileSync(p,'utf8').replace("import { useNavigate } from 'react-router'","import { Link, useNavigate } from 'react-router'")
s=s.replace('fragment?<CollectibleThumbnail path={fragment.thumbnail_path}','(item.map_image_path||fragment)?<CollectibleThumbnail path={item.map_image_path||fragment!.thumbnail_path}')
s=s.replace('<RarityBadge rarity={region.rarity}/>','').replaceAll('지도 조각','지도')
s=s.replace('<p className="text-center text-xs text-muted-foreground">{region.name} 지도이 필요해요.</p>','<Link to="/shop?tab=maps" className="block text-center text-xs text-primary underline underline-offset-4">지도 상점에서 구매하기</Link>')
writeFileSync(p,s)
for(const p of ['src/features/regions/region-page.tsx','src/features/regions/sailing-page.tsx','src/features/regions/destination-strip.tsx'])writeFileSync(p,readFileSync(p,'utf8').replaceAll('지도 조각','지도').replaceAll('지도이','지도가'))
const fishing='src/features/fishing/fishing-panel.tsx'
writeFileSync(fishing,readFileSync(fishing,'utf8').replace(/\{state\?\.mapChanceBp!==undefined&&<p>.*?<\/p>\}/,''))
