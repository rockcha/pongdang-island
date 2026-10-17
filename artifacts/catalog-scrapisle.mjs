import {readFileSync,writeFileSync} from 'node:fs'
const {species}=JSON.parse(readFileSync('artifacts/scrapisle-plan.json','utf8')),path='supabase/catalog/catalog.json',c=JSON.parse(readFileSync(path,'utf8'))
const description='녹슨 배와 떠밀려온 물건들이 작은 섬을 이뤘어요. 고철 사이로 자란 해초와 잊힌 보물을 찾아보세요.'
const region={id:'scrapisle',name:'녹빛 고물섬',description,rarity:'common',sort_order:10,image_path:'scrapisle.png',requires_map_fragment:true}
const map={region_id:'scrapisle',price:1800,thumbnail_path:'map/routes/map-scrapisle_thumbnail.png'}
c.regions=c.regions.filter(r=>r.id!=='scrapisle').concat(region);c.region_maps=c.region_maps.filter(r=>r.region_id!=='scrapisle').concat(map)
const ids=new Set(species.map(s=>s.id));c.collectible_species=c.collectible_species.filter(s=>!ids.has(s.id));c.collectible_habitats=c.collectible_habitats.filter(h=>!ids.has(h.species_id))
const descriptions=[
'찌그러진 통조림 뚜껑에 해초가 걸렸다. 희미한 꽁치 그림만 남은 빈 깡통.',
'주인을 잃은 노란 장화. 물살을 따라 천천히 빙그르르 떠다닌다.',
'오래된 소식이 바닷물에 번진 신문지. 젖은 가장자리가 흐느적거린다.',
'바닥에 구멍 난 낡은 냄비. 구멍 사이로 작은 해초가 자랐다.',
'풀린 테이프가 리본처럼 흔들리는 카세트. 어떤 노래가 담겼는지는 알 수 없다.',
'언젠가의 아침에서 멈춘 탁상시계. 두 종 위에 따개비가 자리 잡았다.',
'기운 솜이 물을 머금은 노란 오리인형. 닳은 단추 눈으로 물길을 바라본다.',
'녹청이 내려앉은 선풍기. 둥근 철망 안에서 오래된 날개가 잠들어 있다.',
'바퀴 하나를 잃고 바닷속에 기대 선 자전거. 바구니가 작은 해초밭이 됐다.',
'황동 자물쇠가 굳게 잠긴 여행 가방. 오래된 여행의 흔적을 간직한다.',
'수화기와 본체 사이에 따개비가 모여 사는 초록 전화기.',
'둥근 유리창에 금이 간 잠수 헬멧. 구리 이음새를 따라 녹청이 피었다.',
'작은 태엽 열쇠를 등에 단 로봇. 바닷속 바닥에서 오래된 주인을 기다린다.',
'뚜껑이 열린 오르골. 조개 무희와 황동 원판이 지난 노래를 간직한다.',
'바퀴와 철망을 해초가 감싼 쇼핑카트. 이제는 작은 생물들의 쉼터다.',
'빛바랜 차체와 깨진 창문 사이로 산호가 자란 폐자동차.',
'깊은 바다에 잠든 자판기. 흐린 유리 너머 오래된 캔과 작은 불빛이 남았다.',
'겹겹의 초록 유리에 물빛이 맺히는 등대 렌즈. 녹슨 받침대 위에서 쉬고 있다.',
'구리 껍질과 두 무한궤도로 바닥을 누비는 탐사 로봇. 카메라와 작은 집게가 물길을 살핀다.',
'폐타이어와 고철을 가득 실은 채 바닥에 잠든 작은 운반선.',
'버려진 물건들을 싣고 떠도는 거대한 수거선. 여섯 초마다 크레인으로 빛나는 고물을 건져 올린다.',
'빈 통조림을 집 삼아 바닥을 부지런히 오가는 소라게.',
'서로 다른 병뚜껑을 방패처럼 든 작은 게. 집게와 다리를 바삐 움직인다.',
'둥글게 닳은 전구 안에서 촉수와 얼굴을 빼꼼 내미는 작은 문어.',
'폐타이어 구멍을 집 삼아 얼굴을 내미는 곰치. 짧은 목이 물살에 살랑인다.',
'녹슨 판금을 닮은 구릿빛 비늘갑옷을 두른 철갑상어. 긴 주둥이 아래 수염이 흐른다.'
]
if(descriptions.length!==species.length)throw Error('Description count')
for(const [i,s] of species.entries()){
 const base=s.kind==='decoration'||s.movement==='fixed'||s.movement==='crawl'
 c.collectible_species.push({id:s.id,kind:s.kind,name:s.name,description:descriptions[i],swim_y_min:s.kind==='decoration'?null:base?'0.84':'0.18',swim_y_max:s.kind==='decoration'?null:base?'0.94':'0.8',speed:s.kind==='decoration'?'0':base?'0.012':s.kind==='trash'?'0.012':s.rarity==='mythic'?'0.012':'0.018',size:s.size,rarity:s.rarity,thumbnail_path:s.thumbnail,sell_price:s.kind==='trash'?8:s.rarity==='common'?18:s.rarity==='rare'?165:s.rarity==='epic'?590:2300,sprite_sheet_path:s.sprite,native_region_id:'scrapisle',movement_type:s.movement,flip_with_direction:s.kind==='fish'&&s.movement!=='fixed',travel_direction:'both'})
 c.collectible_habitats.push({species_id:s.id,region_id:'scrapisle'})
}
for(const key of ['regions','collectible_species'])c[key].sort((a,b)=>a.id.localeCompare(b.id));c.region_maps.sort((a,b)=>a.region_id.localeCompare(b.region_id));c.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
writeFileSync(path,JSON.stringify(c,null,2)+'\n');console.log('Prepared Scrap Isle region, map and26 natives:',Object.groupBy(species,s=>s.kind))
