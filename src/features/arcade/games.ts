import type { ComponentType } from 'react'
import { lazy } from 'react'
import { Brain, Shell, Scan, Pickaxe, Blocks, Castle } from 'lucide-react'
const ShadowGame = lazy(() => import('./shadow-game'))
const MemoryGame = lazy(() => import('./memory-game'))
const OddEvenGame = lazy(() => import('./odd-even-game'))

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
  tags?: ('brain'|'physical'|'luck')[]
  rewardMode?: 'settlement'|'instant'
}
export const arcadeTagLabels={luck:'운빨',brain:'뇌지컬',physical:'피지컬'} as const

// Placeholder concepts: replace or extend these entries when games are approved.
export const arcadeGames: ArcadeGame[] = [
  {id:'odd-even',title:'퐁이의 홀짝 조개',description:'10골드로 시작해 홀짝을 맞히세요. 보상을 받거나 두 배에 도전해요.',icon:Shell,entryFee:10,dailyLimit:null,status:'ready',component:OddEvenGame,thumbnail:'/arcade/odd-even/thumbnail.png',tags:['luck'],rewardMode:'instant'},
  { id: 'shadow', title: '그림자 맞추기', description: '그림자 속 개체의 이름을 맞히고 섬 최고의 기록에 도전하세요.', icon: Scan, entryFee: 10, dailyLimit: null, status: 'ready', component: ShadowGame, thumbnail: '/arcade/shadow-thumbnail.png', tags:['brain'], rewardMode:'settlement' },
  { id: 'memory', title: '카드 짝맞추기', description: '퐁이와 함께 12짝을 찾고 가장 빠른 기록에 도전하세요.', icon: Brain, entryFee: 10, dailyLimit: null, status: 'ready', component: MemoryGame, thumbnail: '/arcade/memory/thumbnail.png', tags:['brain'], rewardMode:'settlement' },
  { id: 'underground', title: '지하 탐험하기', description: '섬 아래 숨겨진 길을 따라 지하 세계를 탐험해요.', icon: Pickaxe, tags:['luck','brain'], status: 'coming-soon' },
  { id: 'brick-breaker', title: '벽돌깨기', description: '공을 튕겨 벽돌을 깨고 새로운 스테이지에 도전해요.', icon: Blocks, tags:['physical'], status: 'coming-soon' },
  { id: 'tower-defense', title: '타워 디펜스', description: '타워를 세우고 전략을 짜서 섬을 지켜요.', icon: Castle, tags:['brain'], status: 'coming-soon' },
]

export function arcadeGamePath(id: string) { return `/arcade/${encodeURIComponent(id)}` }
