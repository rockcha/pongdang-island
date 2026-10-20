import { createClient } from '@/lib/client'
import { randomId } from '@/lib/random-id'

export type BoardAuthor = {
  author_id: string
  author_name: string
  avatar_path: string | null
  equipped_title: string | null
}
export type BoardReactions = { likes: number; dislikes: number; my_reaction: number }
export type BoardPost = BoardAuthor &
  BoardReactions & {
    id: string
    title: string
    body: string
    images: string[]
    created_at: string
    updated_at: string
    comment_count: number
    urls?: Record<string, string>
  }
export type BoardComment = BoardAuthor &
  BoardReactions & {
    id: string
    post_id: string
    parent_id: string | null
    parent_author_name: string | null
    body: string
    deleted: boolean
    created_at: string
    updated_at: string
  }
export type BoardFeed = { items: BoardPost[]; total: number }
export type BoardDetail = { post: BoardPost; comments: BoardComment[]; comment_total: number }
export type BoardPayload = {
  post_id: string
  id?: string
  comment_id?: string
  parent_id?: string | null
  title?: string
  body?: string
  images?: string[]
  value?: number
}
export type BoardAction =
  'save' | 'delete' | 'comment' | 'edit_comment' | 'delete_comment' | 'react'
export async function loadBoardFeed(sort: 'latest' | 'popular', mine: boolean, offset: number) {
  const { data, error } = await createClient().rpc('board_feed', {
    p_sort: sort,
    p_mine: mine,
    p_offset: offset,
  })
  if (error) throw error
  return data
}
export async function loadBoardDetail(id: string, offset = 0): Promise<BoardDetail | null> {
  const client = createClient(),
    { data, error } = await client.rpc('board_detail', { p_id: id, p_offset: offset })
  if (error) throw error
  if (!data) return null
  const paths = data.post.images,
    urls: Record<string, string> = {}
  if (paths.length) {
    const { data: signed, error: signError } = await client.storage
      .from('board-images')
      .createSignedUrls(paths, 3600)
    if (signError) throw signError
    for (const item of signed ?? [])
      if (item.path && item.signedUrl) urls[item.path] = item.signedUrl
  }
  return { ...data, post: { ...data.post, urls } }
}
export async function boardAction(action: BoardAction, payload: BoardPayload) {
  const { data, error } = await createClient().rpc('board_action', {
    p_action: action,
    p_payload: payload,
  })
  if (error) throw error
  return data
}
export async function uploadBoardImage(user: string, post: string, file: File) {
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }
  if (!extensions[file.type] || file.size > 5 * 1024 * 1024) throw new Error('IMAGE_LIMIT')
  const bitmap = await createImageBitmap(file)
  bitmap.close()
  const path = `${user}/${post}/${randomId()}.${extensions[file.type]}`
  const { error } = await createClient()
    .storage.from('board-images')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return { path, url: URL.createObjectURL(file) }
}
export async function removeBoardImages(paths: string[]) {
  if (paths.length) {
    const { error } = await createClient().storage.from('board-images').remove(paths)
    if (error) throw error
  }
}
export function boardError(cause: unknown) {
  const message = String((cause as { message?: string })?.message ?? '')
  if (message.includes('BOARD_RATE_LIMIT')) return '잠깐 쉬었다가 다시 작성해주세요.'
  if (message.includes('NOT_ALLOWED')) return '작성자만 변경할 수 있어요.'
  if (message.includes('BOARD_NOT_FOUND') || message.includes('COMMENT_NOT_FOUND'))
    return '삭제되었거나 찾을 수 없는 내용이에요.'
  if (message.includes('IMAGE_LIMIT') || message.includes('INVALID_BOARD_IMAGE'))
    return 'PNG·JPG·WebP 이미지를 장당 5MB 이내로 첨부해주세요.'
  if (message.includes('INVALID_BOARD')) return '내용과 첨부 이미지를 다시 확인해주세요.'
  return '저장하거나 불러오지 못했어요. 연결을 확인하고 다시 시도해주세요.'
}
