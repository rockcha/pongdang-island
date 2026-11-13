export const TOWER_KINDS = [
  'octopus',
  'seahorse',
  'mortar',
  'flame',
  'laser',
  'plasma',
  'anemone',
  'missile',
  'salvo',
  'sniper',
  'harpoon',
  'frost',
] as const
export type TowerKind = (typeof TOWER_KINDS)[number]
export type BuildKind = TowerKind | 'wall'
export type AttackKind =
  'single' | 'blast' | 'flame' | 'beam' | 'aura' | 'wall' | 'salvo' | 'snipe' | 'frost'

export const TOWER_DESCRIPTIONS: Record<BuildKind, string> = {
  octopus: '공격력과 공격 주기가 균형 잡힌 기본 포탑. 한 적에게 안정적인 피해를 줘요.',
  seahorse: '저렴하게 세울 수 있는 단일 포탑. 초반 적을 꾸준히 막아내기 좋아요.',
  mortar: '공격은 느리지만 폭발로 주변 적까지 맞혀요. 몰려오는 무리에 강해요.',
  flame: '사거리는 짧지만 전방의 여러 적을 계속 태워요. 길목 방어에 좋아요.',
  laser: '공격 사이가 길지만 먼 거리까지 강한 광선을 관통시켜요. 일렬로 모인 적에 강해요.',
  plasma: '고가의 단일 포탑. 빠른 연사로 체력이 높은 적에게 집중 피해를 줘요.',
  anemone: '아주 가까운 주변의 여러 적에게 전격을 줘요. 좁은 길목을 지킬 때 좋아요.',
  wall: '적의 이동 경로를 돌아가게 만들어요. 성까지 이어지는 길은 남겨야 해요.',
  missile: '공중 전용 유도미사일. 튼튼한 비행 적 한 마리를 집중 공격해요.',
  salvo: '공중 전용 다연장 미사일. 서로 다른 비행 적을 최대 네 마리까지 동시에 공격해요.',
  sniper:
    '지상·공중 겸용. 체력이 높은 적을 우선 조준해 강한 한 발을 쏴요. 조준 중 적이 사거리 밖으로 나가면 다시 조준해요.',
  harpoon:
    '지상·공중 겸용. 긴 사거리에서 묵직한 작살을 발사해요. 저격탑보다 자주 쏘지만 한 발의 피해는 낮아요.',
  frost:
    '주변 지상 적을 최대 네 마리까지 감속해요. 강화하면 감속이 강해져요. 효과는 중첩되지 않고 보스에게는 절반만 적용돼요.',
}
type Levels = readonly [number, number, number, number]
type TowerSpec = {
  name: string
  cost: number
  damage: Levels
  interval: Levels
  range: Levels
  upgrades: readonly number[]
  role: string
  color: number
  attack: AttackKind
  cap: number
  area: number
  targetLayer: 'ground' | 'air' | 'both'
  chargeTime: number
  slow: Levels
}
const levels = (base: number): Levels =>
  [base, base * 1.35, base * 1.85, base * 2.6].map((x) => Number(x.toFixed(2))) as unknown as Levels
const fixed = (base: number): Levels => [base, base, base, base]
const ranges = (base: number, short = false): Levels =>
  (short ? [0, 0.05, 0.1, 0.2] : [0, 0.1, 0.2, 0.3]).map((x) =>
    Number((base + x).toFixed(2)),
  ) as unknown as Levels
const tower = (
  name: string,
  cost: number,
  damage: number,
  interval: number,
  range: number,
  upgrades: number[],
  role: string,
  color: number,
  attack: AttackKind = 'single',
  cap = 1,
  area = 0,
  targetLayer: TowerSpec['targetLayer'] = 'ground',
): TowerSpec => ({
  name,
  cost,
  damage: levels(damage),
  interval: fixed(interval),
  range: ranges(range, attack === 'flame' || attack === 'aura'),
  upgrades,
  role,
  color,
  attack,
  cap,
  area,
  targetLayer,
  chargeTime: attack === 'beam' ? 0.6 : attack === 'snipe' ? 1.1 : 0,
  slow: fixed(1),
})
export const BUILDINGS: Record<BuildKind, TowerSpec> = {
  octopus: tower('문어포', 90, 30, 2, 2.8, [35, 55, 70], '한 적에게 묵직한 한 발', 0xbc85a4),
  seahorse: tower('해마포', 60, 12, 1.2, 3, [25, 35, 50], '한 적을 꾸준히 공격', 0x69b7ac),
  mortar: tower(
    '폭탄 대포',
    200,
    40,
    3,
    3.2,
    [80, 120, 160],
    '폭발로 주변 적도 공격',
    0xd6a062,
    'blast',
    5,
    0.9,
  ),
  flame: tower(
    '화염 방사기',
    140,
    10,
    0.2,
    1.8,
    [55, 85, 110],
    '가까운 전방에 지속 피해',
    0xe69b73,
    'flame',
    4,
    Math.PI / 6,
  ),
  laser: tower(
    '진주 레이저',
    260,
    100,
    7,
    5.5,
    [105, 155, 210],
    '충전 후 긴 직선을 관통',
    0x88b9e2,
    'beam',
    5,
    0.45,
  ),
  plasma: tower('플라즈마포', 230, 12, 0.3, 3.2, [90, 140, 185], '한 적에게 빠르게 연사', 0xad94d7),
  anemone: tower(
    '전기 말미잘',
    110,
    4,
    0.5,
    1.15,
    [45, 65, 90],
    '아주 가까운 주변에 전격',
    0xc9bd72,
    'aura',
    5,
  ),
  missile: tower(
    '산호 유도미사일',
    120,
    24,
    0.8,
    4.2,
    [50, 80, 110],
    '공중 한 적을 추적',
    0x7bb5cb,
    'single',
    1,
    0,
    'air',
  ),
  salvo: tower(
    '불가사리 다연장 미사일',
    220,
    18,
    2.4,
    3.8,
    [85, 125, 170],
    '공중 최대 네 적을 동시 공격',
    0xd5aa85,
    'salvo',
    4,
    0,
    'air',
  ),
  sniper: tower(
    '진주 저격탑',
    320,
    160,
    5.2,
    6.2,
    [125, 185, 250],
    '긴 조준 후 정예·보스 집중 공격',
    0xb5d6e8,
    'snipe',
    1,
    0,
    'both',
  ),
  harpoon: tower(
    '작살 가재포',
    240,
    72,
    2.8,
    4.5,
    [95, 145, 195],
    '긴 사거리의 묵직한 작살',
    0xd49a7d,
    'single',
    1,
    0,
    'both',
  ),
  frost: {
    ...tower(
      '빙결 산호탑',
      160,
      4,
      1,
      2.2,
      [60, 90, 135],
      '주변 지상 적을 감속',
      0x89cfdc,
      'frost',
      4,
    ),
    slow: [0.65, 0.6, 0.55, 0.5],
  },
  wall: {
    name: '산호 벽',
    cost: 8,
    damage: fixed(0),
    interval: fixed(0),
    range: fixed(0),
    upgrades: [],
    role: '통로를 남기고 길을 유도해요',
    color: 0xd99b83,
    attack: 'wall',
    cap: 0,
    area: 0,
    targetLayer: 'ground',
    chargeTime: 0,
    slow: fixed(1),
  },
}
export const towerOriginY = (kind: BuildKind) =>
  ({
    octopus: 76 / 128,
    seahorse: 56 / 128,
    mortar: 76 / 128,
    flame: 72 / 128,
    laser: 72 / 128,
    plasma: 0.5,
    anemone: 0.5,
    wall: 0.5,
    missile: 0.5,
    salvo: 0.5,
    sniper: 0.5,
    harpoon: 0.5,
    frost: 0.5,
  })[kind]
export const statNumber = (value: number) => Number(value.toFixed(2)).toString()
