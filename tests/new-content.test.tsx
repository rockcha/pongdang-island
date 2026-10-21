import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useNewContent } from '@/components/use-new-content'

const mock = vi.hoisted(() => ({ owner: 'me', path: '/', board: vi.fn(), exchange: vi.fn(), suggestions:vi.fn(), bugs:vi.fn() }))
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: mock.owner } }, recovery: false }) }))
vi.mock('react-router', () => ({ useLocation: () => ({ pathname: mock.path }) }))
vi.mock('@/features/board/api', () => ({ loadBoardFeed: mock.board }))
vi.mock('@/features/exchange/api', () => ({ loadExchange: mock.exchange }))
vi.mock('@/features/suggestions/api',()=>({loadSuggestions:mock.suggestions}))
vi.mock('@/features/bugs/api',()=>({loadBugReports:mock.bugs}))
beforeEach(() => {
  mock.suggestions.mockResolvedValue({items:[]});mock.bugs.mockResolvedValue({items:[]})
  localStorage.clear(); vi.clearAllMocks(); mock.owner = 'me'; mock.path = '/'
  mock.board.mockResolvedValue({ items: [{ created_at: '2026-10-21T01:00:00Z', author_id: 'other' }] })
  mock.exchange.mockResolvedValue({ items: [{ created_at: '2026-10-21T01:00:00Z', owner_id: 'other', side: 'sell' }] })
})
afterEach(cleanup)
it('tracks suggestions and bug reports independently and clears only the visited destination',async()=>{
 const entry={created_at:'2026-10-21T01:00:00Z',author_id:'other'}
 mock.suggestions.mockResolvedValue({items:[entry]});mock.bugs.mockResolvedValue({items:[entry]})
 const view=renderHook(()=>useNewContent())
 await waitFor(()=>expect(view.result.current.suggestions).toBe(true))
 expect(view.result.current.bugs).toBe(true)
 mock.path='/square/suggestions';view.rerender()
 await waitFor(()=>expect(view.result.current.suggestions).toBe(false))
 expect(view.result.current.bugs).toBe(true)
 mock.path='/square/bugs/one';view.rerender()
 await waitFor(()=>expect(view.result.current.bugs).toBe(false))
 mock.path='/';view.rerender()
 await waitFor(()=>expect(mock.bugs).toHaveBeenCalledTimes(4))
 expect(view.result.current.suggestions).toBe(false)
 expect(view.result.current.bugs).toBe(false)
})
it('shows unseen posts independently and remembers a list visit per account', async () => {
  const view = renderHook(() => useNewContent())
  await waitFor(() => expect(view.result.current).toEqual({ board: true, exchange: true,suggestions:false,bugs:false }))
  mock.path = '/board'; view.rerender()
  await waitFor(() => expect(view.result.current).toEqual({ board: false, exchange: true,suggestions:false,bugs:false }))
  mock.path = '/'; view.rerender()
  await waitFor(() => expect(mock.board).toHaveBeenCalledTimes(3))
  expect(view.result.current.board).toBe(false)
  mock.owner = 'another'; view.rerender()
  await waitFor(() => expect(view.result.current.board).toBe(true))
})
it('ignores own posts and handles failed lookups without blocking navigation', async () => {
  mock.board.mockResolvedValue({ items: [{ created_at: '2026-10-21T01:00:00Z', author_id: 'me' }] })
  mock.exchange.mockRejectedValue(new Error('offline'))
  const view = renderHook(() => useNewContent())
  await waitFor(() => expect(mock.exchange).toHaveBeenCalledOnce())
  expect(view.result.current).toEqual({ board: false, exchange: false,suggestions:false,bugs:false })
})
it('shows the badge again when a newer post arrives after reading the list', async () => {
  mock.path = '/board'
  const view = renderHook(() => useNewContent())
  await waitFor(() => expect(localStorage.getItem('pongdang:content-seen:me:board')).toBeTruthy())
  mock.path = '/'; view.rerender()
  await waitFor(() => expect(mock.board).toHaveBeenCalledTimes(2))
  mock.board.mockResolvedValue({ items: [{ created_at: '2026-10-21T02:00:00Z', author_id: 'other' }] })
  window.dispatchEvent(new Event('board-changed'))
  await waitFor(() => expect(view.result.current.board).toBe(true))
})
