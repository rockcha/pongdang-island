import { createClient } from '@/lib/client'

export type HallPlayer = {
  levelProgress?:number;level?: number
  id: string
  nickname: string
  avatar_path: string | null
  value: number
  rank: number
}
export type HallFeed = { rankings: Record<string, HallPlayer[]>; generatedAt: string }
export type HallComment = {
  id: string
  author_id: string
  nickname: string
  avatar_path: string | null
  body: string
  created_at: string
}
export type HallWall = {
  likes: number
  dislikes: number
  myReaction: number
  total: number
  comments: HallComment[]
}
export type HallAction = {
  p_target: string
  p_action: 'react' | 'comment' | 'delete_comment'
  p_value?: number
  p_body?: string
  p_comment_id?: string
}

export type HallSectionComment = HallComment & {
  sad?: number
  angry?: number
  likes: number
  dislikes: number
  myReaction: number
}
export type HallSectionWall = { total: number; comments: HallSectionComment[] }
export type HallSectionAction = {
  p_section: string
  p_action: 'comment' | 'delete_comment' | 'react'
  p_body?: string
  p_comment_id?: string
  p_value?: number
}
export async function loadSectionWall(section: string, offset = 0): Promise<HallSectionWall> {
  const { data, error } = await createClient().rpc('hall_section_wall', {
    p_section: section,
    p_offset: offset,
  })
  if (error) throw error
  return data
}
export async function actOnSection(args: HallSectionAction): Promise<HallSectionWall> {
  const { data, error } = await createClient().rpc('hall_section_action', args)
  if (error) throw error
  return data
}
export async function loadSectionCounts(): Promise<Record<string, number>> {
  const { data, error } = await createClient().rpc('hall_section_counts', {})
  if (error) throw error
  return data
}

export async function loadHall(): Promise<HallFeed> {
  const { data, error } = await createClient().rpc('hall_of_fame', {})
  if (error) throw error
  return data
}
export async function loadWall(target: string, offset = 0): Promise<HallWall> {
  const { data, error } = await createClient().rpc('hall_wall', {
    p_target: target,
    p_offset: offset,
  })
  if (error) throw error
  return data
}
export async function actOnWall(args: HallAction): Promise<HallWall> {
  const { data, error } = await createClient().rpc('hall_action', args)
  if (error) throw error
  return data
}
export function hallError(cause: unknown) {
  const e = cause as { message?: string; code?: string }
  if (e.code === 'PGRST202' || e.code === '42883')
    return '명예의 전당을 준비하고 있어요. 잠시 후 다시 방문해주세요.'
  if (e.message?.includes('HALL_RATE_LIMIT')) return '잠깐 쉬었다가 다시 남겨주세요.'
  if (e.message?.includes('HALL_SELF_REACTION')) return '나에게는 반응을 남길 수 없어요.'
  if (e.message?.includes('NOT_ALLOWED')) return '내가 쓴 댓글만 삭제할 수 있어요.'
  if (e.message?.includes('INVALID_HALL')) return '댓글은 1~500자로 남겨주세요.'
  return '불러오거나 저장하지 못했어요. 잠시 후 다시 시도해주세요.'
}
