import type { RankingFriend } from './ranking-friend-action'
import { questProgressChanged } from '@/features/quests/progress-events'
import { createClient } from '@/lib/client'
export const memoryFaces = [
  'starfish',
  'shell',
  'pearl',
  'rod',
  'float',
  'lighthouse',
  'boat',
  'treasure',
  'coral',
  'fish',
  'shrimp',
  'letter',
] as const
export const memoryNames: Record<string, string> = {
  starfish: '불가사리',
  shell: '조개',
  pearl: '진주',
  rod: '낚싯대',
  float: '찌',
  lighthouse: '등대',
  boat: '배',
  treasure: '보물상자',
  coral: '산호',
  fish: '물고기',
  shrimp: '새우',
  letter: '편지',
  pongi: '퐁이',
}
export type MemoryRun = {
  id: string
  cards: (string | null)[]
  matched: number[]
  first: number | null
  second: number | null
  clearAt: string | null
  startedAt: string | null
  elapsedMs: number
  moves: number
  finished: boolean
  abandoned: boolean
}
export type MemoryState = { serverNow: string; run: MemoryRun | null }
export type MemoryAction = {
  p_action: 'state' | 'start' | 'flip' | 'clear' | 'leave'
  p_operation_id?: string
  p_run_id?: string
  p_card?: number
}
export type MemoryRank = RankingFriend & {
  rewardGold?: number
  rank: number
  id: string
  elapsedMs: number
  moves: number
  nickname: string
  mine: boolean
}
export type MemoryLeaderboard = {
  rows: MemoryRank[]
  total: number
  offset: number
  pageSize: number
  weekStart: string
  weekEnd: string
  rewards?: number[]
}
export async function memoryAction(args: MemoryAction) {
  const { data, error } = await createClient().rpc('memory_game', args)
  if (error) throw error
  if (args.p_action === 'start') questProgressChanged()
  return data
}
export async function memoryLeaderboard(offset = 0) {
  const { data, error } = await createClient().rpc('memory_leaderboard', { p_offset: offset })
  if (error) throw error
  return data
}
export function memoryError(cause: unknown) {
  const e = cause as { code?: string; message?: string }
  if (e.code === 'PGRST202' || e.code === '42883')
    return '게임 서버 설정이 필요해요. 무료 연습은 이용할 수 있어요.'
  if (e.message?.includes('INSUFFICIENT_GOLD')) return '참가비 10골드가 부족해요.'
  return '연결을 확인하고 다시 시도해주세요. 진행 중인 게임은 유지돼요.'
}
export function memoryTime(ms: number) {
  const seconds = Math.max(0, ms) / 1000
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`
}
