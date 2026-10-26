export type FishingRod={id:string;name:string;description:string;effect:string;price:number;color:string;accent:string;region?:string;failureReductionBp:number;nativeBonusBp:number;waitReductionSeconds?:number}
export const fishingRods:FishingRod[]=[
 {id:'basic',name:'입문용 낚싯대',description:'소박한 대나무 대와 작은 릴, 빨간 찌를 갖춘 첫 낚시 장비예요.',effect:'추가 효과 없음',price:0,color:'#c69857',accent:'#e7d6b6',failureReductionBp:0,nativeBonusBp:0,waitReductionSeconds:0},
 {id:'siren',name:'세이렌의 송가 낚싯대',description:'상아빛 대와 청동 월계관 릴, 청록빛 실에 세이렌의 노래를 담았어요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:1200,color:'#b39559',accent:'#70cbbf',region:'siren',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'mukhyang',name:'여백을 긋는 붓',description:'대나무 붓대와 벼루빛 릴, 백옥 손잡이에 붉은 낙관을 달았어요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:1100,color:'#465650',accent:'#e9e2cd',region:'mukhyang',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'scrapisle',name:'녹빛 고철 낚싯대',description:'되살린 구리 대와 녹청빛 톱니 릴로 만든 고물섬 장비예요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:1000,color:'#528b72',accent:'#d7aa71',region:'scrapisle',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'cloudferry',name:'구름나루 바람 낚싯대',description:'꿀빛 대나무와 초록 실, 구름 문양의 황동 릴을 엮은 나루의 낚싯대예요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:900,color:'#a5a56b',accent:'#fff1ce',region:'cloudferry',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'whitenight',name:'백야 서리 낚싯대',description:'진주빛 대와 은빛 눈꽃 릴에 푸른 빙하의 빛을 담았어요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:600,color:'#78bcd6',accent:'#eaf9ff',region:'whitenight',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'bronze',name:'청동 낚싯대',description:'청동빛 장식과 청록색 릴을 갖춘 든든한 낚싯대예요.',effect:'직접 낚시 대기시간 1초 단축',price:400,color:'#76503a',accent:'#d7b388',failureReductionBp:0,nativeBonusBp:0,waitReductionSeconds:1},
 {id:'pongdang',name:'퐁당 나무 낚싯대',description:'따뜻한 나무와 황동 릴에 섬의 정취를 담았어요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:400,color:'#ac6f35',accent:'#ffbf79',region:'pongdang',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'coral',name:'산호꽃 낚싯대',description:'산호빛 대와 조개 장식이 어우러진 낚싯대예요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:450,color:'#db7c85',accent:'#ffd5b8',region:'coral',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'bluegrove',name:'푸른골 물길 낚싯대',description:'코발트빛 대와 청록 릴에 푸른 수중 골짜기의 물길을 담았어요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:500,color:'#2468af',accent:'#83dcd7',region:'bluegrove',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'mistmoon',name:'안개달 낚싯대',description:'초승달 릴 위로 은빛 안개가 머무는 듯해요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:550,color:'#8c93bc',accent:'#e6dcff',region:'mistmoon',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'starruins',name:'별잠 유물 낚싯대',description:'오래된 별의 문양을 품은 석금속 장비예요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:650,color:'#5d929b',accent:'#e3d2a4',region:'starruins',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'dreamabyss',name:'꿈실 낚싯대',description:'오로라 빛 실과 남보라 릴이 고요히 빛나요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:800,color:'#7661ad',accent:'#9ae4f2',region:'dreamabyss',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'lunea',name:'루네아의 축복',description:'진주빛 낚싯대와 달무리 릴로 완성한 특별한 외형이에요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:750,color:'#b8abd8',accent:'#fff1c9',region:'mistmoon',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'calm',name:'잔물결 낚싯대',description:'어느 바다에서든 든든한 차분한 물빛 장비예요.',effect:'직접 낚시 대기시간 2초 단축',price:750,color:'#4d9291',accent:'#c1eadb',failureReductionBp:0,nativeBonusBp:0,waitReductionSeconds:2},
 {id:'swift',name:'쏜살 낚싯대',description:'짙은 남빛 대와 샴페인 골드 제비 날개 릴, 호박 보석으로 완성한 정교한 낚싯대예요.',effect:'직접 낚시 대기시간 3초 단축',price:1800,color:'#26364f',accent:'#e8c981',failureReductionBp:0,nativeBonusBp:0,waitReductionSeconds:3},
 {id:'nyamnyam',name:'한상 대나무 낚싯대',description:'김빛 대나무 대와 도시락 릴, 연어초밥 찌에 한상바다의 맛있는 풍경을 담았어요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:800,color:'#4d674b',accent:'#f2ad86',region:'nyamnyam',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
 {id:'primal',name:'호박화석 낚싯대',description:'태고의 나무와 화석 마디에 호박빛 릴을 더한 원시섬 장비예요.',effect:'해당 해역에서 주 서식지 개체를 만나기 쉬워져요.',price:700,color:'#596b3d',accent:'#e8b45c',region:'primal',failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1},
]

export function rodSuccessBonusBp(rod:FishingRod){return rod.id==='bronze'?rod.failureReductionBp:0}
