export const MONSTER_KINDS = [
  'crab',
  'swift',
  'armored',
  'healer',
  'boss',
  'swarm',
  'shield',
  'rusher',
  'splitter',
  'mini',
  'overlord',
  'abyss',
  'shark',
  'mako',
  'dolphin',
  'flyingFish',
  'airJelly',
  'cuttlefish',
  'ironCrab',
  'emberMako',
  'crystalCuttlefish',
  'crownHealer',
  'ironKing',
  'eclipseDragon',
] as const
export type EnemyKind = (typeof MONSTER_KINDS)[number]
type MonsterSpec = {
  name: string
  hp: number
  speed: number
  leak: number
  reward: number
  frame: number
  color: number
  boss: boolean
  layer: 'ground' | 'air'
  applyHealthBoost: boolean
}
const spec = (
  name: string,
  hp: number,
  speed: number,
  leak: number,
  reward: number,
  frame: number,
  color: number,
  boss = false,
  layer: MonsterSpec['layer'] = 'ground',
  applyHealthBoost = true,
): MonsterSpec => ({
  name,
  hp,
  speed,
  leak,
  reward,
  frame: frame * 4,
  color,
  boss,
  layer,
  applyHealthBoost,
})
export const MONSTERS: Record<EnemyKind, MonsterSpec> = {
  crab: spec('조개투구 소라게', 24, 0.85, 1, 2, 0, 0xe8a28a),
  swift: spec('물살 새우', 18, 1.35, 1, 2, 1, 0x85bfa9),
  armored: spec('갑옷 돌게', 90, 0.55, 3, 6, 2, 0xa396be),
  healer: spec('진주 소라', 48, 0.7, 2, 5, 3, 0xe3ca91),
  boss: spec('왕관 대왕게', 3040, 0.4, 5, 100, 4, 0xda8c7d, true),
  swarm: spec('무리 해파리', 10, 1.05, 1, 1, 5, 0xa4cbd4),
  shield: spec('보호막 조개', 28, 0.72, 2, 4, 6, 0x9cb9d5),
  rusher: spec('돌진 복어', 36, 0.9, 2, 3, 7, 0xd6b67c),
  splitter: spec('분열 불가사리', 34, 0.8, 2, 2, 8, 0xd5a0a9),
  mini: spec('아기 불가사리', 10, 1.1, 1, 1, 9, 0xe3c0bd),
  overlord: spec('심해왕 문어', 8100, 0.28, 10, 200, 10, 0xab94ce, true),
  // Flying ignores maze detours; a slower approach preserves a fair anti-air damage window.
  abyss: spec('월식의 바다용', 14850, 0.16, 15, 300, 11, 0xb69bdf, true, 'air'),
  // New base health already includes the expansion's difficulty adjustment.
  shark: spec('철갑 백상아리', 180, 0.5, 4, 12, 12, 0x8c9eac, false, 'ground', false),
  mako: spec('돌격 청상아리', 90, 0.85, 3, 9, 13, 0x668eae, false, 'ground', false),
  dolphin: spec('질주 돌고래', 45, 1.6, 2, 6, 14, 0x79bac4, false, 'ground', false),
  flyingFish: spec('하늘 날치', 24, 0.7, 1, 5, 15, 0x89bddd, false, 'air', false),
  airJelly: spec('풍선 해파리', 18, 0.6, 1, 4, 16, 0xd4a9d4, false, 'air', false),
  cuttlefish: spec('비행 갑오징어', 95, 0.5, 3, 12, 17, 0xc4a4bf, false, 'air', false),
  ironCrab: spec('흑철 왕게', 220, 0.48, 4, 20, 18, 0x8992a8, false, 'ground', false),
  emberMako: spec('홍련 청상아리', 115, 0.95, 3, 16, 19, 0xe38d7d, false, 'ground', false),
  crystalCuttlefish: spec('수정 갑오징어', 150, 0.56, 4, 22, 20, 0xb49edb, false, 'air', false),
  crownHealer: spec('왕관 진주소라', 100, 0.6, 3, 18, 21, 0xd6bf81, false, 'ground', false),
  ironKing: spec('심연의 철갑왕', 26000, 0.22, 15, 600, 22, 0x8992a8, true),
  eclipseDragon: spec('완전월식의 바다용', 36000, 0.13, 30, 1000, 23, 0xd792b0, true, 'air'),
}
type Wave = {
  counts: Partial<Record<EnemyKind, number>>
  interval: number
  bonus: number
  hint: string
  gate: number
}
const wave = (
  counts: Wave['counts'],
  interval: number,
  bonus: number,
  hint: string,
  gate = -1,
): Wave => ({ counts, interval, bonus, hint, gate })
const BASE_WAVES: readonly Wave[] = [
  wave({ crab: 8 }, 1.3, 55, '위쪽 두 입구에서 소라게가 찾아와요'),
  wave({ crab: 12, swift: 6 }, 1.1, 55, '빠른 물살 새우를 놓치지 마세요'),
  wave({ crab: 10, swift: 6, swarm: 6 }, 1, 65, '무리 해파리 등장 · 범위 공격이 유리해요'),
  wave({ crab: 12, swift: 6, swarm: 6, armored: 2 }, 0.95, 70, '튼튼한 갑옷 돌게 등장'),
  wave({ crab: 12, swift: 6, swarm: 8, armored: 4 }, 0.9, 75, '빠른 적과 무리가 함께 찾아와요'),
  wave(
    { crab: 10, swift: 8, swarm: 8, armored: 4, shield: 4 },
    0.85,
    60,
    '보호막 조개 등장 · 보호막은 한 번만 생겨요',
  ),
  wave(
    { crab: 10, swift: 8, swarm: 10, armored: 5, shield: 5 },
    0.82,
    65,
    '왼쪽 입구에 적이 더 많이 모여요',
    0,
  ),
  wave(
    { crab: 10, swift: 10, swarm: 10, armored: 6, shield: 4, healer: 2 },
    0.8,
    70,
    '진주 소라가 주변 적을 회복해요',
  ),
  wave(
    { crab: 12, swift: 10, swarm: 10, armored: 7, shield: 5, healer: 2 },
    0.78,
    75,
    '오른쪽 입구의 탱커와 회복 소라를 주의하세요',
    1,
  ),
  wave(
    { crab: 8, swift: 4, armored: 4, shield: 2, healer: 2, boss: 1 },
    1,
    150,
    '보스 · 왼쪽 입구에 왕관 대왕게 등장',
  ),
  wave(
    { crab: 12, swift: 8, swarm: 12, armored: 6, shield: 4, healer: 2, rusher: 4 },
    0.7,
    80,
    '돌진 복어 등장 · 성 가까이에서 빨라져요',
  ),
  wave(
    { crab: 10, swift: 10, swarm: 14, armored: 7, shield: 5, healer: 2, rusher: 4 },
    0.68,
    85,
    '왼쪽 입구의 빠른 적을 막아 주세요',
    0,
  ),
  wave(
    { crab: 10, swift: 10, swarm: 14, armored: 8, shield: 5, healer: 2, rusher: 4, splitter: 3 },
    0.65,
    90,
    '불가사리는 처치하면 두 마리로 나뉘어요',
  ),
  wave(
    { crab: 10, swift: 10, swarm: 14, armored: 9, shield: 6, healer: 3, rusher: 4, splitter: 4 },
    0.62,
    95,
    '오른쪽 입구에 분열하는 적이 모여요',
    1,
  ),
  wave(
    { crab: 10, swift: 12, swarm: 14, armored: 10, shield: 6, healer: 3, rusher: 5, splitter: 4 },
    0.6,
    100,
    '정예 혼합 부대가 찾아와요',
  ),
  wave(
    { crab: 10, swift: 12, swarm: 16, armored: 10, shield: 7, healer: 3, rusher: 6, splitter: 4 },
    0.56,
    105,
    '두 물길을 함께 지켜 주세요',
  ),
  wave(
    { crab: 12, swift: 12, swarm: 16, armored: 11, shield: 7, healer: 3, rusher: 6, splitter: 5 },
    0.52,
    110,
    '왼쪽 입구에 큰 무리가 몰려와요',
    0,
  ),
  wave(
    { crab: 12, swift: 14, swarm: 16, armored: 12, shield: 7, healer: 3, rusher: 6, splitter: 6 },
    0.5,
    115,
    '돌진과 분열이 이어져요',
  ),
  wave(
    { crab: 12, swift: 14, swarm: 18, armored: 12, shield: 8, healer: 3, rusher: 7, splitter: 6 },
    0.48,
    120,
    '정예 혼합 부대 · 오른쪽을 주의하세요',
    1,
  ),
  wave(
    {
      crab: 8,
      swift: 6,
      swarm: 6,
      armored: 4,
      shield: 2,
      healer: 2,
      rusher: 2,
      splitter: 2,
      overlord: 1,
    },
    0.7,
    300,
    '보스 · 오른쪽 입구에 심해왕 문어 등장',
  ),
  wave(
    { armored: 14, shield: 10, healer: 4, swift: 16, rusher: 12, swarm: 22, splitter: 8 },
    0.46,
    130,
    '왼쪽은 탱커와 회복조, 오른쪽은 빠른 돌진조예요',
    2,
  ),
  wave(
    { armored: 15, shield: 10, healer: 4, swift: 16, rusher: 14, swarm: 24, splitter: 8 },
    0.44,
    135,
    '두 입구에 서로 다른 적이 찾아와요',
    2,
  ),
  wave(
    { armored: 16, shield: 11, healer: 4, swift: 16, rusher: 14, swarm: 24, splitter: 9 },
    0.42,
    140,
    '보호막 뒤를 따라오는 빠른 적을 막아 주세요',
    2,
  ),
  wave(
    { armored: 16, shield: 12, healer: 5, swift: 18, rusher: 14, swarm: 26, splitter: 9 },
    0.4,
    145,
    '양쪽 입구의 혼합 부대를 함께 막아 주세요',
    2,
  ),
  wave(
    { armored: 14, shield: 10, healer: 4, swift: 16, rusher: 14, swarm: 34, splitter: 10 },
    0.36,
    150,
    '해파리와 분열 무리가 연달아 몰려와요',
  ),
  wave(
    { armored: 15, shield: 10, healer: 4, swift: 18, rusher: 16, swarm: 36, splitter: 10 },
    0.34,
    155,
    '오른쪽에 짧은 간격으로 무리가 이어져요',
    1,
  ),
  wave(
    { armored: 16, shield: 11, healer: 5, swift: 18, rusher: 16, swarm: 38, splitter: 11 },
    0.32,
    160,
    '왼쪽의 큰 무리를 광역 공격으로 막아 주세요',
    0,
  ),
  wave(
    {
      crab: 12,
      armored: 18,
      shield: 12,
      healer: 5,
      swift: 18,
      rusher: 16,
      swarm: 28,
      splitter: 12,
    },
    0.34,
    170,
    '모든 적이 등장하는 최종 방어 시험이에요',
    2,
  ),
  wave(
    {
      crab: 12,
      armored: 20,
      shield: 12,
      healer: 6,
      swift: 20,
      rusher: 18,
      swarm: 30,
      splitter: 12,
    },
    0.32,
    180,
    '마지막 정예 부대 · 강화와 배치를 마무리하세요',
    2,
  ),
  wave(
    { armored: 8, shield: 4, healer: 3, swift: 8, rusher: 6, swarm: 12, splitter: 5, abyss: 1 },
    0.6,
    500,
    '공중 보스 · 월식의 바다용! 처치 후 31웨이브부터 타워 특화가 열려요',
  ),
]
const OPENING_WAVES = BASE_WAVES.map((base, index) => {
  const wave = index + 1
  const counts = { ...base.counts }
  if (wave >= 8) counts.flyingFish = 2 + Math.floor((wave - 8) / 4)
  if (wave >= 12) counts.shark = 1 + Math.floor((wave - 12) / 5)
  if (wave >= 15) {
    counts.dolphin = 2 + Math.floor((wave - 15) / 4)
    counts.airJelly = 3 + Math.floor((wave - 15) / 5)
  }
  if (wave >= 18) counts.mako = 1 + Math.floor((wave - 18) / 4)
  if (wave >= 22) counts.cuttlefish = 1 + Math.floor((wave - 22) / 4)
  const debut: Record<number, string> = {
    8: '공중 하늘 날치 등장 · 미사일 타워를 준비하세요',
    12: '철갑 백상아리 등장 · 강한 단일 공격을 준비하세요',
    15: '질주 돌고래와 공중 풍선 해파리 등장',
    18: '돌격 청상아리 등장 · 준비 동작 뒤 3초간 돌진해요',
    22: '공중 비행 갑오징어 등장 · 튼튼한 비행 정예예요',
  }
  return { ...base, counts, hint: debut[wave] ?? base.hint }
})
// Replace weak fodder with compact elite squads; health and income remain independently tunable.
const LATE_WAVES: readonly Wave[] = [
 wave({ironCrab:8,shark:6,mako:6},.7,220,'흑철 왕게 등장 · 튼튼한 정예를 집중 공격하세요',0),
 wave({ironCrab:9,emberMako:8,shark:5},.65,230,'홍련 청상아리 등장 · 준비 동작 뒤 강하게 돌진해요',1),
 wave({ironCrab:9,crystalCuttlefish:6,cuttlefish:4},.7,240,'수정 갑오징어 등장 · 공중 화력을 보강하세요'),
 wave({ironCrab:10,emberMako:8,crownHealer:2},.65,250,'왕관 진주소라 등장 · 정예 부대를 회복해요',2),
 wave({ironCrab:12,emberMako:8,crystalCuttlefish:6},.6,270,'지상 탱커와 공중 정예가 함께 찾아와요',2),
 wave({ironCrab:13,emberMako:10,crownHealer:2},.58,280,'회복 소라가 흑철 왕게를 지원해요',0),
 wave({emberMako:14,crystalCuttlefish:9,ironCrab:6},.55,300,'빠른 돌진과 공중 정예의 동시 공격',1),
 wave({ironCrab:14,crystalCuttlefish:8,crownHealer:3},.55,320,'소수 정예 전투 · 지속 화력을 준비하세요',2),
 wave({ironCrab:14,emberMako:12,crystalCuttlefish:8,crownHealer:3},.52,340,'다음은 지상 보스 · 단일 집중 화력을 보강하세요',2),
 wave({ironKing:1,ironCrab:8,emberMako:6,crownHealer:2},.8,700,'40웨이브 보스 · 심연의 철갑왕! 체력이 줄면 철갑 보호막을 펼쳐요',1),
 wave({ironCrab:16,emberMako:12,crystalCuttlefish:9},.54,360,'최상위 정예 구간 · 화력·연사 특화를 활용하세요',2),
 wave({ironCrab:17,crownHealer:3,crystalCuttlefish:10},.52,380,'회복 부대와 비행 정예를 함께 막아주세요',0),
 wave({emberMako:18,ironCrab:12,crystalCuttlefish:10},.5,400,'홍련 청상아리가 오른쪽 입구로 몰려와요',1),
 wave({ironCrab:18,crownHealer:4,crystalCuttlefish:10},.5,420,'강한 정예를 오래 붙잡아 둘 길목을 준비하세요',2),
 wave({ironCrab:18,emberMako:16,crystalCuttlefish:12},.48,440,'지상과 공중의 두꺼운 방어선을 시험해요',2),
 wave({ironCrab:20,emberMako:16,crownHealer:4},.48,460,'흑철 왕게의 대규모 정예 부대',0),
 wave({crystalCuttlefish:18,emberMako:16,ironCrab:10},.48,480,'공중 정예 집중 공격 · 대공 특화를 준비하세요',1),
 wave({ironCrab:20,crystalCuttlefish:16,crownHealer:4},.46,500,'회복 소라의 호위를 먼저 정리하세요',2),
 wave({ironCrab:20,emberMako:18,crystalCuttlefish:16,crownHealer:4},.45,550,'다음은 최종 공중 보스 · 대공 화력과 지상 방어를 함께 준비하세요',2),
 wave({eclipseDragon:1,ironCrab:10,emberMako:8,crystalCuttlefish:8,crownHealer:2},.75,1200,'최종전 · 완전월식의 바다용! 보호막·공중 호위·마지막 가속에 대비하세요',0),
]
export const WAVES: readonly Wave[] = [...OPENING_WAVES,...LATE_WAVES]
export const healthBoost = (wave: number) => (wave <= 5 ? 1.15 : wave <= 15 ? 1.3 : 1.45)
export const healthScale = (wave: number):number => {
  if(wave>30)return healthScale(30)*(1+.065*(Math.min(50,wave)-30))
  const n = Math.max(0, wave - 1)
  return 1.15 * (1 + 0.08 * n + 0.005 * n * n)
}
