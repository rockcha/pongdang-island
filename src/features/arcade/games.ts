import type { ComponentType } from 'react'
import { lazy } from 'react'
import { Brain, Shell, Bubbles, Scan } from 'lucide-react'
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
  tags?: ('memory'|'reasoning'|'luck')[]
  rewardMode?: 'settlement'|'instant'
}
export const arcadeTagLabels={memory:'기억력',reasoning:'추리력',luck:'운'} as const

// Placeholder concepts: replace or extend these entries when games are approved.
export const arcadeGames: ArcadeGame[] = [
  {id:'odd-even',title:'퐁이의 홀짝 조개',description:'10골드로 시작해 홀짝을 맞히세요. 보상을 받거나 두 배에 도전해요.',icon:Shell,entryFee:10,dailyLimit:null,status:'ready',component:OddEvenGame,thumbnail:'/arcade/odd-even/thumbnail.png',tags:['luck'],rewardMode:'instant'},
  { id: 'shadow', title: '그림자 맞추기', description: '그림자 속 개체의 이름을 맞히고 섬 최고의 기록에 도전하세요.', icon: Scan, entryFee: 10, dailyLimit: null, status: 'ready', component: ShadowGame, thumbnail: '/arcade/shadow-thumbnail.png', tags:['reasoning'], rewardMode:'settlement' },
  { id: 'memory', title: '카드 짝맞추기', description: '퐁이와 함께 12짝을 찾고 가장 빠른 기록에 도전하세요.', icon: Brain, entryFee: 10, dailyLimit: null, status: 'ready', component: MemoryGame, thumbnail: '/arcade/memory/thumbnail.png', tags:['memory'], rewardMode:'settlement' },
  { id: 'shells', title: '조개 속 보물 찾기', description: '조개껍데기 아래 숨은 작은 보물을 찾아보세요.', icon: Shell, status: 'coming-soon' },
  { id: 'bubbles', title: '물방울 쌓기', description: '동글동글 물방울을 차곡차곡 쌓아보세요.', icon: Bubbles, status: 'coming-soon' },
]

export function arcadeGamePath(id: string) { return `/arcade/${encodeURIComponent(id)}` }
