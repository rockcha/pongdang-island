export type FishingRod={id:string;name:string;description:string;effect:string;price:number;color:string;accent:string;region?:string;failureReductionBp:number;nativeBonusBp:number}
export const fishingRods:FishingRod[]=[
 {id:'basic',name:'입문용 낚싯대',description:'소박한 대나무 대와 작은 릴, 빨간 찌를 갖춘 첫 낚시 장비예요.',effect:'추가 효과 없음',price:0,color:'#c69857',accent:'#e7d6b6',failureReductionBp:0,nativeBonusBp:0},
 {id:'bronze',name:'청동 낚싯대',description:'청동빛 장식과 청록색 릴을 갖춘 든든한 낚싯대예요.',effect:'사전 추첨 실패율 −1%p',price:800,color:'#76503a',accent:'#d7b388',failureReductionBp:100,nativeBonusBp:0},
 {id:'pongdang',name:'퐁당 나무 낚싯대',description:'따뜻한 나무와 황동 릴에 섬의 정취를 담았어요.',effect:'실패율 −2%p · 퐁당섬 토착 개체 확률 +2%p',price:1500,color:'#ac6f35',accent:'#ffbf79',region:'pongdang',failureReductionBp:200,nativeBonusBp:200},
 {id:'coral',name:'산호꽃 낚싯대',description:'산호빛 대와 조개 장식이 어우러진 낚싯대예요.',effect:'실패율 −2%p · 산호빛 여울 토착 개체 확률 +2%p',price:1500,color:'#db7c85',accent:'#ffd5b8',region:'coral',failureReductionBp:200,nativeBonusBp:200},
 {id:'mistmoon',name:'안개달 낚싯대',description:'초승달 릴 위로 은빛 안개가 머무는 듯해요.',effect:'실패율 −2%p · 안개달 토착 개체 확률 +2%p',price:1500,color:'#8c93bc',accent:'#e6dcff',region:'mistmoon',failureReductionBp:200,nativeBonusBp:200},
 {id:'starruins',name:'별잠 유물 낚싯대',description:'오래된 별의 문양을 품은 석금속 장비예요.',effect:'실패율 −2%p · 별잠 유적 토착 개체 확률 +2%p',price:1500,color:'#5d929b',accent:'#e3d2a4',region:'starruins',failureReductionBp:200,nativeBonusBp:200},
 {id:'dreamabyss',name:'꿈실 낚싯대',description:'오로라 빛 실과 남보라 릴이 고요히 빛나요.',effect:'실패율 −2%p · 꿈먹는 심연 토착 개체 확률 +2%p',price:1500,color:'#7661ad',accent:'#9ae4f2',region:'dreamabyss',failureReductionBp:200,nativeBonusBp:200},
 {id:'lunea',name:'루네아의 축복',description:'진주빛 낚싯대와 달무리 릴로 완성한 특별한 외형이에요.',effect:'실패율 −2%p · 안개달 토착 개체 확률 +2%p',price:3000,color:'#b8abd8',accent:'#fff1c9',region:'mistmoon',failureReductionBp:200,nativeBonusBp:200},
 {id:'calm',name:'잔물결 낚싯대',description:'어느 바다에서든 든든한 차분한 물빛 장비예요.',effect:'사전 추첨 실패율 −3%p',price:2000,color:'#4d9291',accent:'#c1eadb',failureReductionBp:300,nativeBonusBp:0},
 {id:'primal',name:'호박화석 낚싯대',description:'태고의 나무와 화석 마디에 호박빛 릴을 더한 원시섬 장비예요.',effect:'실패율 −2%p · 태고의 원시섬 토착 개체 확률 +2%p',price:1500,color:'#596b3d',accent:'#e8b45c',region:'primal',failureReductionBp:200,nativeBonusBp:200},
]
