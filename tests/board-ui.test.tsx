import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BoardPage, BoardDetailPage } from '@/features/board/board-page'
const api = vi.hoisted(() => ({
  feed: vi.fn(),
  detail: vi.fn(),
  action: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'me' } } }),
}))
vi.mock('@/features/notices/use-operator', () => ({ useOperator: () => ({ operator: false }) }))
vi.mock('@/features/social/social-provider', () => ({
  useSocial: () => ({ refresh: api.refresh }),
}))
vi.mock('@/features/board/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/board/api')>()),
  loadBoardFeed: api.feed,
  loadBoardDetail: api.detail,
  boardAction: api.action,
}))
const post = {
  id: 'post',
  author_id: 'me',
  author_name: '퐁이',
  avatar_path: null,
  equipped_title: '바다의 친구',
  title: '오늘의 바다',
  body: '즐거운 하루',
  images: [],
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
  likes: 2,
  dislikes: 1,
  my_reaction: 1,
  comment_count: 1,
}
const comment = {
  id: 'comment',
  post_id: 'post',
  author_id: 'friend',
  author_name: '친구',
  avatar_path: null,
  equipped_title: null,
  parent_id: null,
  parent_author_name: null,
  body: '반가워요',
  deleted: false,
  created_at: post.created_at,
  updated_at: post.updated_at,
  likes: 0,
  dislikes: 0,
  my_reaction: 0,
}
beforeEach(() => {
  vi.clearAllMocks()
  api.feed.mockResolvedValue({ items: [post], total: 1 })
  api.detail.mockResolvedValue({ post, comments: [comment], comment_total: 1 })
  api.action.mockResolvedValue('post')
})
afterEach(cleanup)
function show(detail = false) {
  render(
    <MemoryRouter initialEntries={[detail ? '/board/post' : '/board']}>
      <Routes>
        <Route path="/board" element={<BoardPage />} />
        <Route path="/board/:postId" element={<BoardDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}
it('loads latest, popular and own posts without showing a square parent', async () => {
  show()
  await screen.findByText('오늘의 바다')
  expect(screen.getByRole('button', { name: '전체' }).getAttribute('aria-pressed')).toBe('true')
  expect(api.feed).toHaveBeenLastCalledWith('latest', false, 0)
  fireEvent.click(screen.getByRole('button', { name: '인기' }))
  await waitFor(() => expect(api.feed).toHaveBeenLastCalledWith('popular', false, 0))
  fireEvent.click(screen.getByRole('button', { name: '내 글' }))
  await waitFor(() => expect(api.feed).toHaveBeenLastCalledWith('latest', true, 0))
})
it('writes a story and opens its detail after saving', async () => {
  show()
  await screen.findByText('오늘의 바다')
  fireEvent.click(screen.getByRole('button', { name: '글쓰기' }))
  fireEvent.change(screen.getByRole('textbox', { name: '게시글 제목' }), {
    target: { value: '새 이야기' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: '게시글 내용' }), {
    target: { value: '함께해요' },
  })
  fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
  await waitFor(() =>
    expect(api.action).toHaveBeenCalledWith(
      'save',
      expect.objectContaining({ title: '새 이야기', body: '함께해요', images: [] }),
    ),
  )
  await screen.findByRole('heading', { name: '오늘의 바다' })
})
it('cancels an own like by setting its desired state and displays reaction errors', async () => {
  show(true)
  await screen.findByRole('heading', { name: '오늘의 바다' })
  const groups = screen.getAllByRole('group', { name: '좋아요와 싫어요' })
  fireEvent.click(within(groups[0]).getByRole('button', { name: '좋아요' }))
  await waitFor(() =>
    expect(api.action).toHaveBeenCalledWith('react', {
      post_id: 'post',
      value: 0,
      comment_id: undefined,
    }),
  )
  await waitFor(() =>
    expect(within(groups[0]).getByRole('button', { name: '좋아요' }).hasAttribute('disabled')).toBe(
      false,
    ),
  )
  api.action.mockRejectedValueOnce(new Error('offline'))
  fireEvent.click(within(groups[0]).getByRole('button', { name: '싫어요' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
})
it('submits a reply to the selected root and retains it for an idempotent retry', async () => {
  show(true)
  await screen.findByText('반가워요')
  fireEvent.click(screen.getByRole('button', { name: '답글' }))
  fireEvent.change(screen.getByRole('textbox', { name: '답글 내용' }), {
    target: { value: '저도 반가워요' },
  })
  api.action.mockRejectedValueOnce(new Error('offline'))
  fireEvent.click(screen.getByRole('button', { name: '등록' }))
  await screen.findByRole('alert')
  const first = api.action.mock.calls[0][1]
  fireEvent.click(screen.getByRole('button', { name: '등록' }))
  await waitFor(() => expect(api.action).toHaveBeenCalledTimes(2))
  expect(api.action.mock.calls[1][1]).toEqual(first)
  expect(first).toMatchObject({ parent_id: 'comment', body: '저도 반가워요', post_id: 'post' })
  await waitFor(() => expect(api.refresh).toHaveBeenCalled())
})
it('asks for confirmation before deleting an own post', async () => {
  show(true)
  await screen.findByRole('heading', { name: '오늘의 바다' })
  fireEvent.click(screen.getByRole('button', { name: '게시물 관리' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: '삭제' }))
  expect(await screen.findByText('이야기를 삭제할까요?')).toBeTruthy()
  expect(api.action).not.toHaveBeenCalled()
})
