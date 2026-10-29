import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SocialProvider, useSocial } from '@/features/social/social-provider'
import { useAuth } from '@/components/auth-provider'
import { loadFriendRequests, syncProfile } from '@/features/friends/api'
import { loadNotifications } from '@/features/notifications/api'
import type { Session } from '@supabase/supabase-js'
import type {AppNotification} from '@/features/social/types'
import {foregroundNoticeEvent} from '@/features/notifications/foreground-notice'

const mocks = vi.hoisted(() => ({
  channels: [] as { handlers: { options: Record<string, string>; callback: (payload: unknown) => void }[]; status?: (value: string) => void }[],
  removeChannel: vi.fn(), toast: vi.fn(),
}))
vi.mock('@/lib/background-session', () => ({hasBackgroundSession: async () => true,isAuthFailure: () => false}))
vi.mock('@/components/auth-provider', () => ({ useAuth: vi.fn(), getNickname: (session: Session | null) => session?.user.user_metadata.game_nickname ?? '' }))
vi.mock('@/features/friends/api', () => ({ syncProfile: vi.fn(), loadProfile: vi.fn().mockResolvedValue({id: 'user-a', nickname:'낚시꾼',friend_code:'ABCDEF123456',avatar_path:null}), loadFriendRequests: vi.fn().mockResolvedValue([]) }))
vi.mock('@/features/notifications/api', () => ({ loadNotifications: vi.fn(),refreshReturnNotifications:vi.fn().mockResolvedValue({created:0,nextAt:null,serverNow:'2026-10-21T00:00:00Z'}) }))
vi.mock('sonner', () => ({ toast: { info: mocks.toast } }))
vi.mock('@/lib/client', () => ({ createClient: () => ({
  removeChannel: mocks.removeChannel,
  auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})},
  channel: () => {
    const entry: typeof mocks.channels[number] = { handlers: [] }
    mocks.channels.push(entry)
    const chain = {
      on: (_type: string, options: Record<string, string>, callback: (payload: unknown) => void) => { entry.handlers.push({ options, callback }); return chain },
      subscribe: (callback?: (value: string) => void) => { entry.status = callback; return chain },
    }
    return chain
  },
}) }))
function socialChannel() { return mocks.channels.find(c=>c.handlers.some(h=>h.options.table==='notifications'))! }
function identity(id: string) {
  return { session: { user: { id, user_metadata: { game_nickname: '낚시꾼' } } } as Session, loading: false, recovery: false, error: null }
}
function Probe() {
  const state = useSocial()
  return <><p data-testid="profile">{state.profile?.id ?? 'none'}</p><p data-testid="count">{state.unread.friend + state.unread.general}</p><p data-testid="connection">{state.connection}</p></>
}
beforeEach(() => {
  mocks.channels.length = 0
  vi.mocked(loadFriendRequests).mockResolvedValue([])
  vi.mocked(useAuth).mockReturnValue(identity('user-a'))
  vi.mocked(syncProfile).mockResolvedValue({ id: 'user-a', nickname: '낚시꾼', friend_code: 'ABCDEF123456', created_at: '' })
  vi.mocked(loadNotifications).mockResolvedValue({ notifications: [], unread: { friend: 1, general: 2 } })
})
afterEach(cleanup)

describe('realtime social lifecycle', () => {
  it('reconciles automatic production rewards once per snapshot and ignores duplicate or foreign receipts',async()=>{
    const callbacks=[vi.fn(),vi.fn(),vi.fn()],events=['wallet-changed','production-changed','bait-production-changed']
    events.forEach((event,i)=>window.addEventListener(event,callbacks[i]))
    try{
      const notice={id:'auto-claim-1',recipient_id:'user-a',category:'general',kind:'system',title:'수확종이 생산물을 챙겼어요',body:'연료 12개를 받았어요.',production_auto_claim:true,read_at:null} as AppNotification
      vi.mocked(loadNotifications).mockResolvedValue({notifications:[notice,{...notice,id:'auto-claim-2'}],unread:{friend:0,general:2}})
      render(<SocialProvider><Probe/></SocialProvider>)
      await waitFor(()=>expect(screen.getByTestId('count').textContent).toBe('2'))
      for(const callback of callbacks)expect(callback).toHaveBeenCalledTimes(1)
      const insert=socialChannel().handlers.find(h=>h.options.table==='notifications'&&h.options.event==='INSERT')!
      act(()=>{insert.callback({new:notice});insert.callback({new:{...notice,id:'other-claim',recipient_id:'user-b'}})})
      for(const callback of callbacks)expect(callback).toHaveBeenCalledTimes(1)
      act(()=>insert.callback({new:{...notice,id:'auto-claim-3'}}))
      for(const callback of callbacks)expect(callback).toHaveBeenCalledTimes(2)
    }finally{events.forEach((event,i)=>window.removeEventListener(event,callbacks[i]))}
  })
  it('routes fresh voyage and trap returns to Pongi cards only once',async()=>{
    const boat={id:'boat-return',recipient_id:'user-a',category:'general',kind:'system',title:'어선이 돌아왔어요!',body:'어획물을 받아주세요.',harbor_voyage_id:'voyage',read_at:null,created_at:new Date().toISOString()} as AppNotification
    const trap={...boat,id:'trap-return',harbor_voyage_id:null,expedition_id:'trap',title:'통발 수확을 준비했어요!'} as AppNotification
    vi.mocked(loadNotifications).mockResolvedValue({notifications:[boat,trap],unread:{friend:0,general:2}})
    const announce=vi.fn();window.addEventListener(foregroundNoticeEvent,announce)
    try{
      render(<SocialProvider><Probe/></SocialProvider>)
      await waitFor(()=>expect(announce).toHaveBeenCalledTimes(2))
      expect(announce.mock.calls.map(([event])=>(event as CustomEvent).detail.url)).toEqual(['/port','/expeditions'])
      const insert=socialChannel().handlers.find(h=>h.options.table==='notifications'&&h.options.event==='INSERT')!
      act(()=>{insert.callback({new:boat});insert.callback({new:trap})})
      expect(announce).toHaveBeenCalledTimes(2)
      expect(mocks.toast).not.toHaveBeenCalled()
    }finally{window.removeEventListener(foregroundNoticeEvent,announce)}
  })
  it('loads stored counts without replaying historical toasts and subscribes with owner filters', async () => {
    render(<SocialProvider><Probe /></SocialProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'))
    expect(mocks.toast).not.toHaveBeenCalled()
    expect(socialChannel().handlers.filter(h => h.options.table === 'notifications').every(h => h.options.filter === 'recipient_id=eq.user-a')).toBe(true)
  })
  it('deduplicates insertion toasts and refreshes stored data for updates', async () => {
    render(<SocialProvider><Probe /></SocialProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'))
    const insert = socialChannel().handlers.find(h => h.options.table === 'notifications' && h.options.event === 'INSERT')!
    const event = { new: { id: 'notification-1', title: '친구 요청', body: '함께해요', category: 'friend' } }
    act(() => { insert.callback(event); insert.callback(event) })
    expect(mocks.toast).toHaveBeenCalledTimes(1)
    vi.mocked(loadNotifications).mockResolvedValue({ notifications: [], unread: { friend: 2, general: 2 } })
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('4'))
  })
  it('catches up on reconnect and removes the channel on unmount', async () => {
    const view = render(<SocialProvider><Probe /></SocialProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'))
    act(() => socialChannel().status?.('CHANNEL_ERROR'))
    expect(screen.getByTestId('connection').textContent).toBe('offline')
    vi.mocked(loadNotifications).mockResolvedValue({ notifications: [], unread: { friend: 0, general: 1 } })
    act(() => socialChannel().status?.('SUBSCRIBED'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    view.unmount()
    expect(mocks.removeChannel).toHaveBeenCalledTimes(mocks.channels.length)
  })
  it('clears account data and ignores an old channel after logout', async () => {
    const view = render(<SocialProvider><Probe /></SocialProvider>)
    await waitFor(() => expect(screen.getByTestId('profile').textContent).toBe('user-a'))
    const old = socialChannel()
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, recovery: false, error: null })
    view.rerender(<SocialProvider><Probe /></SocialProvider>)
    expect(screen.getByTestId('profile').textContent).toBe('none')
    expect(screen.getByTestId('count').textContent).toBe('0')
    act(() => old.handlers[0].callback({ new: { id: 'old', category: 'friend', title: 'old' } }))
    expect(mocks.toast).not.toHaveBeenCalled()
    expect(mocks.removeChannel).toHaveBeenCalledTimes(mocks.channels.length)
  })
})

it('filters profile subscriptions and applies profile updates without inbox refetches', async () => {
 render(<SocialProvider><Probe /></SocialProvider>)
 await waitFor(()=>expect(screen.getByTestId('count').textContent).toBe('3'))
 const subscriptions=mocks.channels.flatMap(channel=>channel.handlers).filter(h=>h.options.table==='player_profiles')
 expect(subscriptions).toHaveLength(1)
 expect(subscriptions[0].options.filter).toBe('id=in.(user-a)')
 const before=vi.mocked(loadNotifications).mock.calls.length
 act(()=>subscriptions[0].callback({new:{id:'user-a',nickname:'Updated'}}))
 await act(async()=>{})
 expect(vi.mocked(loadNotifications).mock.calls.length).toBe(before)
})
