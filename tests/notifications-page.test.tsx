import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationsPage } from '@/features/notifications/notifications-page'

const { markRead, refresh,loadGifts } = vi.hoisted(() => ({ markRead: vi.fn(), refresh: vi.fn(),loadGifts:vi.fn() }))
vi.mock('@/features/gifts/api',async original=>({...await original<typeof import('@/features/gifts/api')>(),loadGifts}))
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: 'me' } } }) }))
vi.mock('@/features/notifications/api', () => ({ markRead }))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({refresh}),GoldIcon:()=>null}))
vi.mock('@/features/social/social-provider', () => ({ useSocial: () => ({
  notifications: [
    { id:'notice-1',notice_id:'new-notice',title:'공지 도착',body:'새 공지',category:'notice',kind:'announcement',read_at:null,created_at:'2026-10-14T00:00:00Z' },
    { id: 'friend-1', title: '친구 요청 도착', body: '함께해요', category: 'friend', kind: 'friend_request', request: null, read_at: null, created_at: '2026-10-14T00:00:00Z' },
    { id: 'news-1', title: '새로운 섬 소식', body: '곧 만나요', category: 'general', kind: 'announcement', request: null, read_at: null, created_at: '2026-10-14T00:00:00Z' },
  ], unread: { notice:1,friend: 3, general: 7 }, loading: false, error: null, connection: 'live', refresh,
}) }))
beforeEach(() => {vi.clearAllMocks(); markRead.mockResolvedValue(undefined); refresh.mockResolvedValue(undefined);loadGifts.mockResolvedValue({items:[],total:0}) })
afterEach(cleanup)

describe('notification categories and read state', () => {
  it('separates friend and general tabs while showing server unread totals', () => {
    render(<MemoryRouter><NotificationsPage /></MemoryRouter>)
    expect(screen.getByRole('button', { name: '공지 (1)' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('link',{name:/공지 도착/}).getAttribute('href')).toBe('/square/notices/new-notice')
    fireEvent.click(screen.getByRole('button', { name: '친구 (3)' }))
    expect(screen.getByRole('heading', { name: '친구 요청 도착' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '새로운 섬 소식' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '소식 (7)' }))
    expect(screen.getByRole('heading', { name: '새로운 섬 소식' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '친구 요청 도착' })).toBeNull()
  })
  it('renders one gift mailbox with one empty state and switches direction without duplicated notifications',async()=>{
    render(<MemoryRouter><NotificationsPage/></MemoryRouter>)
    fireEvent.click(screen.getByRole('button',{name:'선물'}))
    expect(await screen.findAllByText('아직 도착한 선물이 없어요.')).toHaveLength(1)
    expect(screen.getAllByRole('button',{name:'받은 선물'})).toHaveLength(1)
    expect(screen.getAllByRole('button',{name:'보낸 선물'})).toHaveLength(1)
    expect(screen.queryByText('아직 도착한 알림이 없어요.')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'보낸 선물'}))
    expect(await screen.findAllByText('아직 보낸 선물이 없어요.')).toHaveLength(1)
    expect(loadGifts).toHaveBeenLastCalledWith('sent',0)
  })
  it('links to the original notice without manual read controls',async()=>{
    render(<MemoryRouter><NotificationsPage/></MemoryRouter>)
    fireEvent.click(screen.getByRole('link',{name:/공지 도착/}))
    expect(markRead).not.toHaveBeenCalled()
  })
  it('has no manual read buttons in any category', async () => {
    render(<MemoryRouter><NotificationsPage /></MemoryRouter>)
    for(const name of ['공지 (1)','친구 (3)','소식 (7)','선물']){fireEvent.click(screen.getByRole('button',{name}));expect(screen.queryByRole('button',{name:/모두 읽음|읽음으로 표시|선물 알림 읽음/})).toBeNull()}
  })
})
