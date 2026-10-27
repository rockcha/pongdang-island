import type { ComponentType } from 'react'
import { lazy } from 'react'
import { Brain, Shell, Scan, Pickaxe, Blocks, Castle } from 'lucide-react'
const ShadowGame = lazy(() => import('./shadow-game'))
const MemoryGame = lazy(() => import('./memory-game'))
const OddEvenGame = lazy(() => import('./odd-even-game'))
const BrickBreakerGame = lazy(() => import('./brick-breaker-game'))
const LadderGame = lazy(() => import('./ladder-game'))
const PongiWhackGame = lazy(() => import('./pongi-whack-game'))
const TideDefenseGame = lazy(() => import('./tide-defense-game'))

export type ArcadeGame = {
  id: string
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  // null means free/unlimited. Omitted means the rule is not decided yet.
  entryFee?: number | null
  dailyLimit?: number | null
  status: 'ready' | 'coming-soon'
  component?: ComponentType
  thumbnail?: string
  tags?: ('brain' | 'physical' | 'luck')[]
  rewardMode?: 'settlement' | 'instant' | 'both'
  operatorOnly?: boolean
}
export const arcadeTagLabels = { luck: '운빨', brain: '뇌지컬', physical: '피지컬' } as const

// Placeholder concepts: replace or extend these entries when games are approved.
export const arcadeGames: ArcadeGame[] = [
  {
    id: 'pongi-whack',
    title: '퐁이 잡기',
    description: '30초 동안 진짜 퐁이를 찾아요. 두 종류의 가짜를 조심하세요!',
    icon: Pickaxe,
    entryFee: 10,
    dailyLimit: null,
    status: 'ready',
    component: PongiWhackGame,
    thumbnail: '/arcade/pongi-whack/thumbnail-clean.webp',
    tags: ['physical'],
    rewardMode: 'both',
  },
  {
    id: 'ladder',
    title: '퐁이의 물결 사다리',
    description: '다섯 바다와 베팅금을 고르고 여섯 갈래 사다리에서 행운을 만나요.',
    icon: Shell,
    entryFee: 0,
    dailyLimit: null,
    status: 'ready',
    component: LadderGame,
    thumbnail: '/arcade/ladder/thumbnail.jpg',
    tags: ['luck'],
    rewardMode: 'instant',
  },
  {
    id: 'odd-even',
    title: '퐁이의 홀짝 조개',
    description: '30골드로 시작해 홀짝을 맞히세요. 보상을 받거나 두 배에 도전해요.',
    icon: Shell,
    entryFee: 30,
    dailyLimit: null,
    status: 'ready',
    component: OddEvenGame,
    thumbnail: '/arcade/odd-even/thumbnail.png',
    tags: ['luck'],
    rewardMode: 'instant',
  },
  {
    id: 'shadow',
    title: '그림자 맞추기',
    description: '그림자 속 개체의 이름을 맞히고 섬 최고의 기록에 도전하세요.',
    icon: Scan,
    entryFee: 10,
    dailyLimit: null,
    status: 'ready',
    component: ShadowGame,
    thumbnail: '/arcade/shadow-thumbnail.png',
    tags: ['brain'],
    rewardMode: 'settlement',
  },
  {
    id: 'memory',
    title: '카드 짝맞추기',
    description: '퐁이와 함께 12짝을 찾고 가장 빠른 기록에 도전하세요.',
    icon: Brain,
    entryFee: 10,
    dailyLimit: null,
    status: 'ready',
    component: MemoryGame,
    thumbnail: '/arcade/memory/thumbnail.png',
    tags: ['brain'],
    rewardMode: 'settlement',
  },
  {
    id: 'underground',
    title: '지하 탐험하기',
    description: '섬 아래 숨겨진 길을 따라 지하 세계를 탐험해요.',
    icon: Pickaxe,
    tags: ['luck', 'brain'],
    status: 'coming-soon',
  },
  {
    id: 'brick-breaker',
    title: '벽돌깨기',
    description: '무료로 도전하고 5개 라운드의 보상과 해적의 보물을 모아요.',
    icon: Blocks,
    entryFee: 0,
    dailyLimit: null,
    tags: ['physical'],
    status: 'ready',
    component: BrickBreakerGame,
    thumbnail: '/arcade/brick-breaker/thumbnail.png',
    rewardMode: 'instant',
  },
  {
    id: 'tower-defense',
    operatorOnly: true,
    title: '바닷길 방어전 · 연습',
    description: '바닷길 주변에 타워를 설치하고 강화해 5번의 파도를 막아요. 무료 연습판 · 보상 없음.',
    icon: Castle,
    tags: ['brain'],
    entryFee: 0,
    dailyLimit: null,
    status: 'ready',
    component: TideDefenseGame,
  },
]

export function arcadeGamePath(id: string) {
  return `/arcade/${encodeURIComponent(id)}`
}
