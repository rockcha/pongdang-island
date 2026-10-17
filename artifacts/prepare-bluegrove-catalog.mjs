import {readFileSync,writeFileSync} from 'node:fs'
const plan=JSON.parse(readFileSync('artifacts/bluegrove-expansion-plan.json','utf8'))
const catalogPath='supabase/catalog/catalog.json'
const catalog=JSON.parse(readFileSync(catalogPath,'utf8'))
const descriptions={
 'silverblade-swordfish':'은백색 몸과 길고 납작한 검 모양 주둥이를 가진 대형 황새치.',
 'billowsail-sailfish':'청록색 돛지느러미가 물결처럼 펼쳐지는 날렵한 돛새치.',
 'steelback-bluefin-tuna':'강철빛 푸른 등과 단단하고 둥근 몸통을 가진 참다랑어.',
 'scale-armored-barracuda':'갑옷처럼 겹친 은색 비늘과 길게 뻗은 턱이 특징인 바라쿠다.',
 'goldstripe-amberjack':'은빛 옆구리를 따라 금빛 줄이 이어지는 날렵한 부시리.',
 'giant-seabass':'큼직한 아가미와 넓은 입을 가진 은회색 대왕농어.',
 'seawing-giant-manta':'짙은 푸른 날개와 진주빛 배를 지닌 거대한 가오리. 넓은 날개가 유려하게 물결친다.',
 'anchor-chain-rock':'굵은 닻 쇠사슬이 감긴 둥근 바위. 작은 해초가 푸른골 물길에 흔들린다.',
 'silver-ripple-mullet':'은빛 비늘에 잔물결이 비치는 통통한 숭어.',
 'blueback-spanish-mackerel':'푸른 등과 길쭉한 은빛 몸을 가진 삼치.',
 'bluestripe-flyingfish':'파란 줄무늬와 날개 같은 가슴지느러미를 가진 날치.',
 'striped-needlefish':'긴 주둥이와 청록색 줄무늬가 돋보이는 가느다란 동갈치.',
 'bluegrove-spearfish':'푸른골 물길을 따라 긴 창 같은 주둥이로 나아가는 청새치.',
 'bronze-yellowtail':'청동빛 등이 은은하게 빛나는 두툼한 방어.',
 'bluegrove-giant-seabass':'푸른골 암반색의 청록 반점과 커다란 입을 가진 토착 대왕농어.',
 'sunken-channel-marker':'파도와 방향 화살표가 새겨진 오래된 항로 표지석.',
 'sandburied-cannon':'푸른골 모래에 반쯤 묻힌 낡은 청동 대포. 포신에 조개와 해초가 붙어 있다.',
 'longtail-thresher-shark':'몸만큼 긴 꼬리가 부드럽게 휘어지는 은청색 환도상어.',
 'blue-spotted-leopard-shark':'유려한 긴 몸에 푸른 점무늬가 흐르는 푸른골의 표범상어.',
 'blue-scaled-mahi-mahi':'높은 이마와 길게 이어진 등지느러미, 청금빛 비늘을 가진 만새기.',
 'ripple-pattern-giant-moray':'굵고 긴 몸을 따라 청록색 물결무늬가 이어지는 거대한 곰치.',
 'seila-white-sail-guardian':'거대한 흰 돛으로 푸른골의 항로를 지키는 신화의 돛새치. 돛을 펼치면 푸른 항로 문양에 빛이 흐른다.',
}
const ids=new Set(plan.map(s=>s.id))
catalog.collectible_species=catalog.collectible_species.filter(s=>!ids.has(s.id))
catalog.collectible_habitats=catalog.collectible_habitats.filter(s=>!ids.has(s.species_id))
for(const s of plan){
 const decoration=s.kind==='decoration',folder=s.rarity==='common'?'normal':s.rarity
 const prefix=`${decoration?'decorations':'fish'}/${folder}/${s.id}`
 const speed=decoration?'0':s.id.includes('moray')?'0.018':s.rarity==='mythic'?'0.02':s.size>=145?'0.025':'0.035'
 catalog.collectible_species.push({id:s.id,kind:decoration?'decoration':'fish',name:s.name,description:descriptions[s.id],
  swim_y_min:decoration?null:'0.18',swim_y_max:decoration?null:'0.8',speed,size:s.size,rarity:s.rarity,
  thumbnail_path:`${prefix}_thumbnail.png`,sell_price:s.price,sprite_sheet_path:decoration?null:`${prefix}_sprite.png`,
  native_region_id:s.scope==='bluegrove'?'bluegrove':null,movement_type:decoration?'fixed':'swim',flip_with_direction:!decoration,travel_direction:'both'})
 for(const region of s.scope==='bluegrove'?['bluegrove']:catalog.regions.map(r=>r.id))catalog.collectible_habitats.push({species_id:s.id,region_id:region})
}
catalog.collectible_species.sort((a,b)=>a.id<b.id?-1:1)
catalog.collectible_habitats.sort((a,b)=>(a.species_id+'\0'+a.region_id)<(b.species_id+'\0'+b.region_id)?-1:1)
writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n')
console.log(`Prepared ${plan.length} species; ${plan.filter(s=>s.scope==='shared').length} shared, ${plan.filter(s=>s.scope==='bluegrove').length} native.`)
