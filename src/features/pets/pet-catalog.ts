export const petSpecies = [
  {
    id: 'sand-golem',
    name: '모래뭉',
    description: '작은 돌손으로 마음을 전하는 느긋한 골렘.',
    color: '#c8a56b',
  },
  {
    id: 'wave-cat',
    name: '파도냥',
    description: '물결 꼬리를 살랑이는 호기심 많은 고양이.',
    color: '#81b8c5',
  },
  {
    id: 'mochi-dragon',
    name: '모찌룽',
    description: '간식과 낮잠을 좋아하는 말랑한 아기용.',
    color: '#e8b0a4',
  },
  {
    id: 'jelly-seal',
    name: '젤리코',
    description: '작은 지느러미로 박수치는 다정한 아기 물범.',
    color: '#b6cadb',
  },
  {"id":"maple-panda","name":"단풍콩","description":"풍성한 꼬리를 안고 마음을 전하는 아기 레서판다.","color":"#c78d69","profile":"균형형","atlas":true},
  {"id":"poka-shark","name":"포카롱","description":"작은 이빨로 활짝 웃는 듬직한 아기 상어.","color":"#8bb8c7","profile":"장시간형","atlas":true},
  {"id":"acorn-squirrel","name":"도토롱","description":"볼 가득 간식을 모으는 부지런한 아기 다람쥐.","color":"#b38c61","profile":"빠른 회전형","atlas":true},
  {"id":"hedge-pin","name":"토닥핀","description":"작은 앞발로 꼼꼼하게 정리하는 아기 고슴도치.","color":"#ac937c","profile":"안정형","atlas":true},
  {"id":"bonbon-triceratops","name":"봉봉룡","description":"작은 뿔 세 개로 씩씩하게 돕는 아기 트리케라톱스.","color":"#a8c7ad","profile":"장시간형","atlas":true},
  {"id":"nurung-fox","name":"누룽콩","description":"커다란 귀로 이야기를 듣는 아기 사막여우.","color":"#d3b47f","profile":"빠른 회전형","atlas":true},
  {"id":"ppinu-penguin","name":"삐누","description":"짧은 날개를 가지런히 모으는 반듯한 아기 펭귄.","color":"#a5b3c3","profile":"균형·안정형","atlas":true},
  {"id":"coco-capybara","name":"코코팡","description":"느긋하게 곁을 지켜주는 아기 카피바라.","color":"#b79a7e","profile":"장시간 안정형","atlas":true},
  {"id":"peach-axolotl","name":"복숭뇽","description":"꽃잎 아가미를 살랑이는 복숭아빛 아기 우파루파.","color":"#e6b6bb","profile":"중단시간형","atlas":true},
  {"id":"cloud-alpaca","name":"구름파카","description":"포실한 곱슬털에 온기를 품은 아기 알파카.","color":"#d5c8ae","profile":"중장시간형","atlas":true},
] as const
export type PetSpeciesId = (typeof petSpecies)[number]['id']
export type PetClip = 'idleA' | 'idleB' | 'hungry' | 'lonely' | 'happy' | 'eat'
export const PET_CARE_MS = 3000
export const PET_NAME_MAX_LENGTH = 8
export const PET_DECAY_MS = 10 * 60_000
export const PET_SELL_PRICE = 1000
export const PET_FOOD_PRICE = 50
export const PET_FOOD_GAIN = 50
export const PET_AFFECTION_GAIN = 40
export const PET_MAX_LEVEL = 5
export const PET_JOB_BONUS_PERCENT = 3
export const petJobBonus = (level: number) => Math.min(PET_MAX_LEVEL, Math.max(0, Math.floor(level))) * PET_JOB_BONUS_PERCENT
export const petJobDuration = (minutes: number) => minutes < 60 ? `${minutes}분` : `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}`
export const petActions = [
  { id: 'stroke', label: '쓰다듬기' },
  { id: 'bath', label: '목욕하기' },
  // Keep the preview key compatible with existing local sandbox saves.
  { id: 'sleep', label: '사진 찍어주기' },
  { id: 'play', label: '놀아주기' },
] as const
export type PetCareAction = (typeof petActions)[number]['id']
export type PetInteractionAction = PetCareAction | 'feed'
// Previous sandbox receipts stay claimable at their original reward and deadline.
export const legacyPetJobs = [
  {
    id: 'bakery',
    name: '빵집 반죽 지킴이',
    minutes: 60,
    requiredLevel: 0,
    min: 100,
    max: 150,
    description: '따뜻한 반죽이 잘 부푸는지 살펴봐요.',
  },
  {
    id: 'florist',
    name: '꽃가게 꽃다발 도우미',
    minutes: 180,
    requiredLevel: 0,
    min: 330,
    max: 450,
    description: '꽃다발에 어울리는 리본을 골라요.',
  },
  {
    id: 'inn',
    name: '여관 창가 화분 돌보미',
    minutes: 480,
    requiredLevel: 0,
    min: 800,
    max: 1120,
    description: '창가의 화분에 물을 주고 햇살을 살펴봐요.',
  },
  {
    id: 'dock',
    name: '부두 표 검사원',
    minutes: 45,
    requiredLevel: 2,
    min: 150,
    max: 210,
    description: '배에 오르는 손님들의 표를 확인해요.',
  },
  {
    id: 'post',
    name: '별빛 우체국 분류원',
    minutes: 300,
    requiredLevel: 2,
    min: 850,
    max: 1150,
    description: '편지를 목적지별로 차곡차곡 나눠요.',
  },
  {
    id: 'market',
    name: '새벽 시장 물건 지킴이',
    minutes: 720,
    requiredLevel: 2,
    min: 1920,
    max: 2400,
    description: '잠든 시장의 작은 가게들을 지켜요.',
  },
  {
    id: 'teahouse',
    name: '요정 찻집 찻잔 정리원',
    minutes: 30,
    requiredLevel: 4,
    min: 160,
    max: 200,
    description: '요정 손님들의 작은 찻잔을 정리해요.',
  },
  {
    id: 'observatory',
    name: '별자리 관측소 기록원',
    minutes: 240,
    requiredLevel: 4,
    min: 1040,
    max: 1360,
    description: '밤하늘에서 찾은 별자리를 기록해요.',
  },
  {
    id: 'lighthouse',
    name: '등대 야간 당직',
    minutes: 600,
    requiredLevel: 4,
    min: 2200,
    max: 2800,
    description: '밤바다의 배들을 위해 등불을 지켜요.',
  },
] as const
export const petJobs = [
  {
    "id": "sand-golem-clay",
    "speciesId": "sand-golem",
    "name": "도자기 공방 흙 고르기",
    "minutes": 120,
    "min": 340,
    "max": 420,
    "artwork": "bakery",
    "description": "작은 돌손으로 도자기에 쓸 흙을 골라요."
  },
  {
    "id": "sand-golem-garden",
    "speciesId": "sand-golem",
    "name": "모래 정원 길 다지기",
    "minutes": 480,
    "min": 1360,
    "max": 1520,
    "artwork": "inn",
    "description": "정원의 모래길을 단단하고 고르게 다져요."
  },
  {
    "id": "wave-cat-lost",
    "speciesId": "wave-cat",
    "name": "항구 분실물 분류",
    "minutes": 45,
    "min": 135,
    "max": 165,
    "artwork": "dock",
    "description": "항구에 남겨진 물건을 주인별로 나눠요."
  },
  {
    "id": "wave-cat-cafe",
    "speciesId": "wave-cat",
    "name": "해변 카페 테이블 정리",
    "minutes": 180,
    "min": 540,
    "max": 660,
    "artwork": "teahouse",
    "description": "파도 소리를 들으며 찻잔을 정리해요."
  },
  {
    "id": "mochi-dragon-bread",
    "speciesId": "mochi-dragon",
    "name": "빵집 발효실 온기 돌보기",
    "minutes": 60,
    "min": 180,
    "max": 220,
    "artwork": "bakery",
    "description": "반죽이 잘 부풀도록 포근한 온기를 지켜요."
  },
  {
    "id": "mochi-dragon-furnace",
    "speciesId": "mochi-dragon",
    "name": "유리 공방 화로 지킴이",
    "minutes": 360,
    "min": 1020,
    "max": 1260,
    "artwork": "lighthouse",
    "description": "작은 불씨가 고르게 타는지 살펴봐요."
  },
  {
    "id": "jelly-seal-ice",
    "speciesId": "jelly-seal",
    "name": "빙과점 얼음 틀 정리",
    "minutes": 90,
    "min": 270,
    "max": 330,
    "artwork": "bakery",
    "description": "깨끗한 얼음 틀을 차곡차곡 정리해요."
  },
  {
    "id": "jelly-seal-cold",
    "speciesId": "jelly-seal",
    "name": "얼음 창고 야간 점검",
    "minutes": 600,
    "min": 1700,
    "max": 1900,
    "artwork": "market",
    "description": "밤새 얼음 창고가 시원한지 확인해요."
  },
  {
    "id": "maple-panda-tea",
    "speciesId": "maple-panda",
    "name": "단풍 찻집 다과 포장",
    "minutes": 120,
    "min": 340,
    "max": 420,
    "artwork": "teahouse",
    "description": "작은 앞발로 다과 상자에 리본을 매요."
  },
  {
    "id": "maple-panda-snacks",
    "speciesId": "maple-panda",
    "name": "숲속 여관 간식 꾸러미 준비",
    "minutes": 300,
    "min": 850,
    "max": 1050,
    "artwork": "inn",
    "description": "여행자를 위한 간식을 정성껏 담아요."
  },
  {
    "id": "poka-shark-buoy",
    "speciesId": "poka-shark",
    "name": "해변 안전 부표 순찰",
    "minutes": 240,
    "min": 680,
    "max": 840,
    "artwork": "dock",
    "description": "해변의 부표가 제자리에 있는지 살펴봐요."
  },
  {
    "id": "poka-shark-coral",
    "speciesId": "poka-shark",
    "name": "산호 양식장 야간 순찰",
    "minutes": 600,
    "min": 1600,
    "max": 2000,
    "artwork": "lighthouse",
    "description": "조용한 밤바다의 어린 산호를 지켜요."
  },
  {
    "id": "acorn-squirrel-orders",
    "speciesId": "acorn-squirrel",
    "name": "도토리 가게 주문 담기",
    "minutes": 30,
    "min": 85,
    "max": 115,
    "artwork": "market",
    "description": "주문한 도토리를 빠짐없이 담아요."
  },
  {
    "id": "acorn-squirrel-mail",
    "speciesId": "acorn-squirrel",
    "name": "숲속 우편함 편지 배달",
    "minutes": 90,
    "min": 270,
    "max": 330,
    "artwork": "post",
    "description": "숲속 친구들에게 작은 편지를 전해요."
  },
  {
    "id": "hedge-pin-thread",
    "speciesId": "hedge-pin",
    "name": "수선집 실패 정리",
    "minutes": 180,
    "min": 540,
    "max": 600,
    "artwork": "florist",
    "description": "색색의 실을 엉키지 않게 정리해요."
  },
  {
    "id": "hedge-pin-seeds",
    "speciesId": "hedge-pin",
    "name": "씨앗 창고 재고 지킴이",
    "minutes": 480,
    "min": 1360,
    "max": 1520,
    "artwork": "inn",
    "description": "내년에 심을 씨앗을 꼼꼼히 세어요."
  },
  {
    "id": "bonbon-triceratops-harvest",
    "speciesId": "bonbon-triceratops",
    "name": "과수원 수확 바구니 운반",
    "minutes": 360,
    "min": 1020,
    "max": 1260,
    "artwork": "market",
    "description": "잘 익은 과일 바구니를 조심히 옮겨요."
  },
  {
    "id": "bonbon-triceratops-fossil",
    "speciesId": "bonbon-triceratops",
    "name": "화석 발굴장 흙더미 정리",
    "minutes": 720,
    "min": 1920,
    "max": 2400,
    "artwork": "observatory",
    "description": "작은 화석이 다치지 않게 흙을 정리해요."
  },
  {
    "id": "nurung-fox-spice",
    "speciesId": "nurung-fox",
    "name": "향신료 가게 주문 전달",
    "minutes": 45,
    "min": 135,
    "max": 165,
    "artwork": "market",
    "description": "향긋한 주문 꾸러미를 손님에게 전해요."
  },
  {
    "id": "nurung-fox-oasis",
    "speciesId": "nurung-fox",
    "name": "오아시스 찻집 손님 안내",
    "minutes": 120,
    "min": 360,
    "max": 440,
    "artwork": "teahouse",
    "description": "긴 귀로 손님의 이야기를 듣고 자리를 안내해요."
  },
  {
    "id": "ppinu-penguin-box",
    "speciesId": "ppinu-penguin",
    "name": "빙과점 아이스박스 정리",
    "minutes": 60,
    "min": 180,
    "max": 200,
    "artwork": "bakery",
    "description": "아이스박스를 크기별로 반듯하게 정리해요."
  },
  {
    "id": "ppinu-penguin-temperature",
    "speciesId": "ppinu-penguin",
    "name": "냉장 창고 온도 확인",
    "minutes": 240,
    "min": 720,
    "max": 800,
    "artwork": "market",
    "description": "차가운 창고의 온도를 꼼꼼히 기록해요."
  },
  {
    "id": "coco-capybara-towels",
    "speciesId": "coco-capybara",
    "name": "온천 수건 바구니 돌보기",
    "minutes": 300,
    "min": 880,
    "max": 970,
    "artwork": "inn",
    "description": "따뜻한 수건을 바구니에 채워 둬요."
  },
  {
    "id": "coco-capybara-yuzu",
    "speciesId": "coco-capybara",
    "name": "유자탕 온도 지킴이",
    "minutes": 600,
    "min": 1700,
    "max": 1900,
    "artwork": "teahouse",
    "description": "손님이 편안하도록 유자탕의 온기를 살펴요."
  },
  {
    "id": "peach-axolotl-sprouts",
    "speciesId": "peach-axolotl",
    "name": "수초 가게 새순 분류",
    "minutes": 90,
    "min": 270,
    "max": 330,
    "artwork": "florist",
    "description": "여린 수초 새순을 크기별로 나눠요."
  },
  {
    "id": "peach-axolotl-lotus",
    "speciesId": "peach-axolotl",
    "name": "연꽃 온실 물길 돌보기",
    "minutes": 180,
    "min": 540,
    "max": 660,
    "artwork": "inn",
    "description": "연꽃 사이로 맑은 물이 흐르도록 돌봐요."
  },
  {
    "id": "cloud-alpaca-laundry",
    "speciesId": "cloud-alpaca",
    "name": "구름 세탁소 수건 개기",
    "minutes": 180,
    "min": 510,
    "max": 630,
    "artwork": "florist",
    "description": "포근한 수건을 구름처럼 폭신하게 개어요."
  },
  {
    "id": "cloud-alpaca-bedding",
    "speciesId": "cloud-alpaca",
    "name": "별빛 여관 침구 준비",
    "minutes": 480,
    "min": 1280,
    "max": 1600,
    "artwork": "inn",
    "description": "여행자의 잠자리에 깨끗한 이불을 준비해요."
  }
] as const
export type PetJob = (typeof petJobs)[number]
export type PetJobId = PetJob['id'] | (typeof legacyPetJobs)[number]['id']
export const petJobsFor = (speciesId: PetSpeciesId) => petJobs.filter(job => job.speciesId === speciesId)
export const petJobById = (id: PetJobId) => petJobs.find(job => job.id === id) ?? legacyPetJobs.find(job => job.id === id)
export function petJobRewards(job: Pick<PetJob, 'min' | 'max'>, level: number) {
  const percent = 100 + petJobBonus(level)
  return {min: Math.round(job.min * percent / 100), max: Math.round(job.max * percent / 100)}
}
export const petUsesAtlas = (id: PetSpeciesId) => petSpecies.some(p => p.id === id && 'atlas' in p && p.atlas)
export const petBaits = [
  {
    id: 'starter',
    name: '포슬포슬 간식주머니',
    price: 120,
    petBp: 200,
    commonBp: 7800,
    rareBp: 1800,
    epicBp: 180,
    mythicBp: 20,
    description: '작은 간식을 담은 입문용 주머니예요. 작은 친구와 희귀한 개체를 함께 기다려요.',
  },
  {
    id: 'biscuit',
    name: '바삭별 비스킷',
    price: 200,
    petBp: 300,
    commonBp: 8200,
    rareBp: 1200,
    epicBp: 280,
    mythicBp: 20,
    description: '별 모양 비스킷의 고소한 향이 작은 친구들을 불러요.',
  },
  {
    id: 'macaron',
    name: '포근꿈 마카롱',
    price: 300,
    petBp: 500,
    commonBp: 8000,
    rareBp: 1200,
    epicBp: 280,
    mythicBp: 20,
    description: '포근한 크림과 달콤한 향에 수줍은 친구도 다가와요.',
  },
] as const
export type PetBaitId = (typeof petBaits)[number]['id']
export const petSpeciesById = (id: PetSpeciesId) => petSpecies.find((s) => s.id === id)!
