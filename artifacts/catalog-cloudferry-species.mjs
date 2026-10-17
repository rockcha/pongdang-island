import {readFileSync,writeFileSync} from 'node:fs'
const {species:plan}=JSON.parse(readFileSync('artifacts/cloudferry-expansion-plan.json','utf8'))
const path='supabase/catalog/catalog.json',catalog=JSON.parse(readFileSync(path,'utf8'))
const descriptions=[
 '별사탕 하나를 높이 들고 바닥을 부지런히 오가는 작은 검댕이.',
 '조개껍데기 안에 숨어 작은 팔과 반짝이는 눈을 내미는 검댕이.',
 '이 빠진 찻잔을 집 삼아 가장자리로 얼굴을 빼꼼 내미는 검댕이.',
 '구름처럼 몽글한 갓 아래로 짧은 촉수가 살랑이는 작은 해파리.',
 '작은 물고기의 모험이 시작됐던 초록 양동이. 둥근 손잡이에 물방울의 흔적이 남았다.',
 '누군가 나루에 두고 간 낡은 우산. 물살에 닳은 천과 굽은 나무 손잡이가 남았다.',
 '이끼 낀 돌에 앉아 고개를 갸웃하는 작은 숲의 정령.',
 '나무 목욕표를 품에 안고 바닥을 바삐 오가는 목욕탕의 개구리.',
 '까맣게 그을린 장작 위에서 불꽃 끝을 꼼지락거리는 작은 캘시퍼.',
 '초록 양동이 밖으로 얼굴과 작은 지느러미를 내민 꼬마 포뇨.',
 '주황 머리카락과 붉은 꼬리를 흔들며 물길을 누비는 작은 포뇨.',
 '작은 화덕 안에서 표정을 바꾸며 따뜻한 금빛 불꽃을 흔드는 정령.',
 '붉은 리본과 옷자락을 물살에 맡긴 배달부. 빗자루 뒤에는 지지가 함께 탄다.',
 '늑대 가면과 털 망토를 걸치고 제자리에 서서 숲의 물길을 지키는 산.',
 '흰 털과 긴 꼬리를 물살에 흩날리며 조용히 나아가는 숲의 늑대.',
 '오래된 나무 상자 속 색색의 약병. 작은 마개마다 마법사의 생활 흔적이 남아 있다.',
 '하얀 종이로 접힌 식신들이 팔과 모서리를 팔랑이며 함께 물길을 가른다.',
 '긴 흰 몸과 청록 갈기, 수염을 물살에 흘려보내며 유려하게 나아가는 백룡 하쿠.',
 '작은 나무배에 조용히 앉아 구름나루의 풍경을 바라보는 가오나시.',
 '여러 발을 차례로 움직이며 바닥을 달리는 고양이버스. 창문에는 포근한 불빛이 머문다.',
 '따뜻한 등불을 들고 제자리에 선 가오나시. 검은 옷자락과 등불 술이 물결친다.',
 '물고기 모양 파도를 타고 달리는 포뇨. 붉은 옷과 주황 머리카락이 파도 위에서 팔랑인다.',
 '구름처럼 몽글한 우산을 들고 빗소리에 귀를 기울이는 토토로.',
 '커다란 연잎 우산 아래 쉬어 가는 둥근 오물신. 이끼와 갈대 끝에 맑은 빛방울이 맺힌다.',
 '네 기계 다리로 바닥을 천천히 걷는 하울의 성. 여섯 초마다 창문을 따라 캘시퍼의 따뜻한 불빛이 번진다.'
]
if(descriptions.length!==plan.length)throw Error('Description mismatch')
const managed=new Set(plan.map(s=>s.id))
catalog.collectible_species=catalog.collectible_species.filter(s=>!managed.has(s.id))
catalog.collectible_habitats=catalog.collectible_habitats.filter(h=>!managed.has(h.species_id))
for(const [i,s] of plan.entries()){
 const fixed=s.movement==='fixed',crawl=s.movement==='crawl'
 catalog.collectible_species.push({id:s.id,kind:s.kind,name:s.name,description:descriptions[i],swim_y_min:s.kind==='decoration'?null:fixed||crawl?'0.84':'0.18',swim_y_max:s.kind==='decoration'?null:fixed||crawl?'0.94':'0.8',speed:s.kind==='decoration'?'0':fixed||crawl?'0.012':s.rarity==='epic'?'0.018':'0.028',size:s.size,rarity:s.rarity,thumbnail_path:s.thumbnail,sell_price:s.kind==='trash'?5:s.rarity==='common'?24:s.rarity==='rare'?210:s.rarity==='epic'?610:2400,sprite_sheet_path:s.sprite,native_region_id:'cloudferry',movement_type:s.movement,flip_with_direction:!fixed,travel_direction:'both'})
 catalog.collectible_habitats.push({species_id:s.id,region_id:'cloudferry'})
}
catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id));catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
writeFileSync(path,JSON.stringify(catalog,null,2)+'\n')
console.log('Prepared exactly 25 Cloud Ferry native species; shared habitats preserved.')
