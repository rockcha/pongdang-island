import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HallPage } from '@/features/hall-of-fame/hall-page'
const api = vi.hoisted(() => ({ feed: vi.fn(), wall: vi.fn(), action: vi.fn(), counts: vi.fn() }))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'me' } } }),
}))
vi.mock('@/features/hall-of-fame/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/hall-of-fame/api')>()),
  loadHall: api.feed,
  loadSectionWall: api.wall,
  actOnSection: api.action,
  loadSectionCounts: api.counts,
}))
const player = { id: 'friend', nickname: '바다퐁', avatar_path: null, value: 1200, rank: 1 }
const wall = { total: 0, comments: [] }
beforeEach(() => {
  vi.clearAllMocks()
  api.feed.mockResolvedValue({ rankings: { casts: [player] }, generatedAt: '2026-10-21T10:00:00Z' })
  api.wall.mockResolvedValue(wall)
  api.action.mockResolvedValue(wall)
  api.counts.mockResolvedValue({ casts: 0 })
})
afterEach(cleanup)
it('orders both tabs and opens section discussions', async () => {
  render(<HallPage />)
  await screen.findByLabelText('1위 바다퐁, 1,200회')
  expect(
    screen
      .getAllByRole('heading', { level: 3 })
      .slice(0, 5)
      .map((h) => h.textContent),
  ).toEqual(['낚시 횟수', '잡은 물고기', '도감 해금', '얻은 신화', '낚시 대비 신화 비율'])
  expect(screen.getAllByText('집계 기준')).toHaveLength(14)
  expect(screen.getByText('거래소 물품 최다 구매')).toBeTruthy()
  expect(screen.getByText('거래소 물품 최다 판매')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /1위 바다퐁/ })).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: '별별 기록' }))
  expect(
    screen
      .getAllByRole('heading', { level: 3 })
      .slice(0, 4)
      .map((h) => h.textContent),
  ).toEqual(['하루 최다 낚시', '최다 조작 MISS', '장식물 획득', '쓰레기 획득'])
  expect(screen.getAllByText('집계 기준')).toHaveLength(10)
  expect(screen.queryByText('최다 연속 성공')).toBeNull()
  expect(screen.queryByText('최장 연속 낚시 일수')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: '명예로운 기록' }))
  fireEvent.click(screen.getByRole('button', { name: '낚시 횟수 이야기 열기' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('낚시 횟수 이야기')).toBeTruthy()
  expect(await within(dialog).findByText('첫 한마디를 남겨주세요')).toBeTruthy()
  expect(api.wall).toHaveBeenCalledWith('casts')
})
it('preserves drafts on failure and saves/deletes section comments', async () => {
  render(<HallPage />)
  fireEvent.click(await screen.findByRole('button', { name: '낚시 횟수 이야기 열기' }))
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
    total: 1,
    comments: [
      {
        id: 'c1',
        author_id: 'me',
        nickname: '나',
        avatar_path: null,
        body: '축하해요!',
        created_at: '2026-10-21T10:00:00Z',
        likes: 0,
        dislikes: 0,
        myReaction: 0,
      },
    ],
  })
  fireEvent.click(within(dialog).getByRole('button', { name: '댓글 등록' }))
  expect(await within(dialog).findByText('축하해요!')).toBeTruthy()
  expect(input.value).toBe('')
  expect(api.action).toHaveBeenLastCalledWith({
    p_section: 'casts',
    p_action: 'comment',
    p_body: '축하해요!',
  })
  expect(
    (within(dialog).getByRole('button', { name: '좋아요' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  fireEvent.click(within(dialog).getByRole('button', { name: '내 댓글 삭제' }))
  await waitFor(() =>
    expect(api.action).toHaveBeenLastCalledWith({
      p_section: 'casts',
      p_action: 'delete_comment',
      p_comment_id: 'c1',
    }),
  )
})
it('reacts to comments instead of ranked players', async () => {
  const comment = {
    id: 'c2',
    author_id: 'other',
    nickname: '친구',
    avatar_path: null,
    body: '응원해요',
    created_at: '2026-10-21T10:00:00Z',
    likes: 1,
    dislikes: 0,
    myReaction: 0,
  }
  api.wall.mockResolvedValue({ total: 1, comments: [comment] })
  api.action.mockResolvedValue({ total: 1, comments: [{ ...comment, likes: 2, myReaction: 1 }] })
  render(<HallPage />)
  fireEvent.click(await screen.findByRole('button', { name: '낚시 횟수 이야기 열기' }))
  const dialog = await screen.findByRole('dialog')
  await within(dialog).findByText('응원해요')
  fireEvent.click(within(dialog).getByRole('button', { name: '좋아요' }))
  await waitFor(() =>
    expect(api.action).toHaveBeenCalledWith({
      p_section: 'casts',
      p_action: 'react',
      p_comment_id: 'c2',
      p_value: 1,
    }),
  )
  await waitFor(() =>
    expect(
      within(dialog).getByRole('button', { name: '좋아요' }).getAttribute('aria-pressed'),
    ).toBe('true'),
  )
})
it('keeps rankings available when discussion counts fail and ranking requests recover', async () => {
  api.counts.mockRejectedValue(new Error('not deployed'))
  api.feed.mockRejectedValueOnce(new Error('offline'))
  render(<HallPage />)
  expect(await screen.findByRole('alert')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  expect(await screen.findByLabelText('1위 바다퐁, 1,200회')).toBeTruthy()
  expect(screen.getByRole('button', { name: '낚시 횟수 이야기 열기' })).toBeTruthy()
})
