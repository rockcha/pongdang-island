import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HallPage } from '@/features/hall-of-fame/hall-page'

const api = vi.hoisted(() => ({ feed: vi.fn(), wall: vi.fn(), action: vi.fn() }))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'me' } } }),
}))
vi.mock('@/features/hall-of-fame/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/hall-of-fame/api')>()),
  loadHall: api.feed,
  loadWall: api.wall,
  actOnWall: api.action,
}))
const player = { id: 'friend', nickname: '바다퐁', avatar_path: null, value: 1200, rank: 1 }
const wall = { likes: 2, dislikes: 1, myReaction: 0, total: 0, comments: [] }
beforeEach(() => {
  vi.clearAllMocks()
  api.feed.mockResolvedValue({
    rankings: { casts: [player], helps: [{ ...player, value: 8 }] },
    generatedAt: '2026-10-21T10:00:00Z',
  })
  api.wall.mockResolvedValue(wall)
  api.action.mockResolvedValue(wall)
})
afterEach(cleanup)

it('shows the six main and eight fun rankings, and opens a player comment modal from their avatar', async () => {
  render(<HallPage />)
  const avatar = await screen.findByRole('button', { name: /1위 바다퐁, 1,200회/ })
  expect(screen.getAllByText('집계 기준')).toHaveLength(14)
  expect(screen.getByText('도움왕')).toBeTruthy()
  expect(screen.getByText('받은 좋아요')).toBeTruthy()
  expect(screen.getByText('받은 싫어요')).toBeTruthy()
  fireEvent.click(avatar)
  const dialog = await screen.findByRole('dialog')
  expect(await within(dialog).findByText('첫 한마디를 남겨주세요')).toBeTruthy()
  expect(api.wall).toHaveBeenCalledWith('friend')
  expect(
    (within(dialog).getByRole('button', { name: '댓글 등록' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  fireEvent.click(within(dialog).getByRole('button', { name: '좋아요' }))
  await waitFor(() =>
    expect(api.action).toHaveBeenCalledWith({ p_target: 'friend', p_action: 'react', p_value: 1 }),
  )
})

it('sends comments to the selected player, preserves text on failure, and allows retry', async () => {
  render(<HallPage />)
  fireEvent.click(await screen.findByRole('button', { name: /1위 바다퐁, 1,200회/ }))
  const dialog = await screen.findByRole('dialog')
  await within(dialog).findByText('첫 한마디를 남겨주세요')
  const input = within(dialog).getByRole('textbox', { name: '댓글 내용' }) as HTMLTextAreaElement
  fireEvent.change(input, { target: { value: ' 축하해요! ' } })
  api.action.mockRejectedValueOnce(new Error('offline'))
  fireEvent.click(within(dialog).getByRole('button', { name: '댓글 등록' }))
  await waitFor(() =>
    expect(
      (within(dialog).getByRole('button', { name: '댓글 등록' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  )
  expect(input.value).toBe(' 축하해요! ')
  api.action.mockResolvedValueOnce({
    ...wall,
    total: 1,
    comments: [
      {
        id: 'c1',
        author_id: 'me',
        nickname: '나',
        avatar_path: null,
        body: '축하해요!',
        created_at: '2026-10-21T10:00:00Z',
      },
    ],
  })
  fireEvent.click(within(dialog).getByRole('button', { name: '댓글 등록' }))
  expect(await within(dialog).findByText('축하해요!')).toBeTruthy()
  expect(input.value).toBe('')
  expect(api.action).toHaveBeenLastCalledWith({
    p_target: 'friend',
    p_action: 'comment',
    p_body: '축하해요!',
  })
  fireEvent.click(within(dialog).getByRole('button', { name: '내 댓글 삭제' }))
  await waitFor(() =>
    expect(api.action).toHaveBeenLastCalledWith({
      p_target: 'friend',
      p_action: 'delete_comment',
      p_comment_id: 'c1',
    }),
  )
})

it('shows a recoverable loading error without invented leaderboard entries', async () => {
  api.feed.mockRejectedValueOnce(new Error('offline'))
  render(<HallPage />)
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByText('바다퐁')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  expect(await screen.findByRole('button', { name: /1위 바다퐁, 1,200회/ })).toBeTruthy()
})
