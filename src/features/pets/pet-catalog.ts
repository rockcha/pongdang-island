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
] as const
export type PetSpeciesId = (typeof petSpecies)[number]['id']
export type PetClip = 'idleA' | 'idleB' | 'hungry' | 'lonely' | 'happy' | 'eat'
export const PET_CARE_MS = 3000
export const PET_DECAY_MS = 10 * 60_000
export const PET_SELL_PRICE = 1000
export const PET_FOOD_PRICE = 50
export const PET_FOOD_GAIN = 40
export const PET_AFFECTION_GAIN = 40
export const PET_MAX_LEVEL = 4
export const PET_JOB_TIERS = [0, 2, 4] as const
export const petJobDuration = (minutes: number) => minutes < 60 ? `${minutes}분` : `${minutes / 60}시간`
export const petActions = [
  { id: 'stroke', label: '쓰다듬기' },
  { id: 'bath', label: '목욕하기' },
  // Keep the preview key compatible with existing local sandbox saves.
  { id: 'sleep', label: '사진 찍어주기' },
  { id: 'play', label: '놀아주기' },
] as const
export type PetCareAction = (typeof petActions)[number]['id']
export type PetInteractionAction = PetCareAction | 'feed'
export const petJobs = [
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
export type PetJobId = (typeof petJobs)[number]['id']
export const petBaits = [
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
