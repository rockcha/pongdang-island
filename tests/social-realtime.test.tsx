import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SocialProvider, useSocial } from '@/features/social/social-provider'
import { useAuth } from '@/components/auth-provider'
import { syncProfile } from '@/features/friends/api'
import { loadNotifications } from '@/features/notifications/api'
import type { Session } from '@supabase/supabase-js'

const mocks = vi.hoisted(() => ({
  channels: [] as { handlers: { options: Record<string, string>; callback: (payload: unknown) => void }[]; status?: (value: string) => void }[],
  removeChannel: vi.fn(), toast: vi.fn(),
}))
vi.mock('@/components/auth-provider', () => ({ useAuth: vi.fn(), getNickname: (session: Session | null) => session?.user.user_metadata.game_nickname ?? '' }))
vi.mock('@/features/friends/api', () => ({ syncProfile: vi.fn(), loadProfile: vi.fn().mockResolvedValue({id: 'user-a', nickname:'낚시꾼',friend_code:'ABCDEF123456',avatar_path:null}), loadFriendRequests: vi.fn().mockResolvedValue([]) }))
vi.mock('@/features/notifications/api', () => ({ loadNotifications: vi.fn() }))
vi.mock('sonner', () => ({ toast: { info: mocks.toast } }))
vi.mock('@/lib/client', () => ({ createClient: () => ({
  removeChannel: mocks.removeChannel,
  channel: () => {
    const entry: typeof mocks.channels[number] = { handlers: [] }
    mocks.channels.push(entry)
    const chain = {
      on: (_type: string, options: Record<string, string>, callback: (payload: unknown) => void) => { entry.handlers.push({ options, callback }); return chain },
      subscribe: (callback: (value: string) => void) => { entry.status = callback; return chain },
    }
    return chain
  },
}) }))
function identity(id: string) {
  return { session: { user: { id, user_metadata: { game_nickname: '낚시꾼' } } } as Session, loading: false, recovery: false, error: null }
}
function Probe() {
  const state = useSocial()
  return <><p data-testid="profile">{state.profile?.id ?? 'none'}</p><p data-testid="count">{state.unread.friend + state.unread.general}</p><p data-testid="connection">{state.connection}</p></>
}
beforeEach(() => {
  mocks.channels.length = 0
  vi.mocked(useAuth).mockReturnValue(identity('user-a'))
  vi.mocked(syncProfile).mockResolvedValue({ id: 'user-a', nickname: '낚시꾼', friend_code: 'ABCDEF123456', created_at: '' })
  vi.mocked(loadNotifications).mockResolvedValue({ notifications: [], unread: { friend: 1, general: 2 } })
})
afterEach(cleanup)

describe('realtime social lifecycle', () => {
  it('loads stored counts without replaying historical toasts and subscribes with owner filters', async () => {
    render(<SocialProvider><Probe /></SocialProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'))
    expect(mocks.toast).not.toHaveBeenCalled()
    expect(mocks.channels[0].handlers.filter(h => h.options.table === 'notifications').every(h => h.options.filter === 'recipient_id=eq.user-a')).toBe(true)
  })
  it('deduplicates insertion toasts and refreshes stored data for updates', async () => {
    render(<SocialProvider><Probe /></SocialProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'))
    const insert = mocks.channels[0].handlers.find(h => h.options.table === 'notifications' && h.options.event === 'INSERT')!
    const event = { new: { id: 'notification-1', title: '친구 요청', body: '함께해요', category: 'friend' } }
    act(() => { insert.callback(event); insert.callback(event) })
    expect(mocks.toast).toHaveBeenCalledTimes(1)
    vi.mocked(loadNotifications).mockResolvedValue({ notifications: [], unread: { friend: 2, general: 2 } })
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('4'))
  })
  it('catches up on reconnect and removes the channel on unmount', async () => {
    const view = render(<SocialProvider><Probe /></SocialProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'))
    act(() => mocks.channels[0].status?.('CHANNEL_ERROR'))
    expect(screen.getByTestId('connection').textContent).toBe('offline')
    vi.mocked(loadNotifications).mockResolvedValue({ notifications: [], unread: { friend: 0, general: 1 } })
    act(() => mocks.channels[0].status?.('SUBSCRIBED'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    view.unmount()
    expect(mocks.removeChannel).toHaveBeenCalledOnce()
  })
  it('clears account data and ignores an old channel after logout', async () => {
    const view = render(<SocialProvider><Probe /></SocialProvider>)
    await waitFor(() => expect(screen.getByTestId('profile').textContent).toBe('user-a'))
    const old = mocks.channels[0]
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, recovery: false, error: null })
    view.rerender(<SocialProvider><Probe /></SocialProvider>)
    expect(screen.getByTestId('profile').textContent).toBe('none')
    expect(screen.getByTestId('count').textContent).toBe('0')
    act(() => old.handlers[0].callback({ new: { id: 'old', category: 'friend', title: 'old' } }))
    expect(mocks.toast).not.toHaveBeenCalled()
    expect(mocks.removeChannel).toHaveBeenCalledOnce()
  })
})
