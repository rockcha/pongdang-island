import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationsPage } from '@/features/notifications/notifications-page'

const { markRead, refresh } = vi.hoisted(() => ({ markRead: vi.fn(), refresh: vi.fn() }))
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: 'me' } } }) }))
vi.mock('@/features/notifications/api', () => ({ markRead }))
vi.mock('@/features/social/social-provider', () => ({ useSocial: () => ({
  notifications: [
    { id: 'friend-1', title: '친구 요청 도착', body: '함께해요', category: 'friend', kind: 'friend_request', request: null, read_at: null, created_at: '2026-10-14T00:00:00Z' },
    { id: 'news-1', title: '새로운 섬 소식', body: '곧 만나요', category: 'general', kind: 'announcement', request: null, read_at: null, created_at: '2026-10-14T00:00:00Z' },
  ], unread: { friend: 3, general: 7 }, loading: false, error: null, connection: 'live', refresh,
}) }))
beforeEach(() => { markRead.mockResolvedValue(undefined); refresh.mockResolvedValue(undefined) })
afterEach(cleanup)

describe('notification categories and read state', () => {
  it('separates friend and general tabs while showing server unread totals', () => {
    render(<MemoryRouter><NotificationsPage /></MemoryRouter>)
    expect(screen.getByRole('button', { name: '전체 (10)' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '친구 (3)' }))
    expect(screen.getByRole('heading', { name: '친구 요청 도착' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '새로운 섬 소식' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '소식 (7)' }))
    expect(screen.getByRole('heading', { name: '새로운 섬 소식' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '친구 요청 도착' })).toBeNull()
  })
  it('marks the selected category read rather than altering request status', async () => {
    render(<MemoryRouter><NotificationsPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: '친구 (3)' }))
    fireEvent.click(screen.getByRole('button', { name: '모두 읽음' }))
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    expect(markRead).toHaveBeenCalledWith('me', undefined, 'friend')
  })
})
