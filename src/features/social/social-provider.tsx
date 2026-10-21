import {NotificationIcon} from '@/features/notifications/notification-icon'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { getNickname, useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/client'
import { loadFriendRequests, loadProfile, syncProfile } from '@/features/friends/api'
import { loadNotifications } from '@/features/notifications/api'
import {useReturnNotifications} from '@/features/notifications/use-return-notifications'
import { socialErrorMessage } from './types'
import type { AppNotification, FriendRequest, Profile, UnreadCounts } from './types'

type Connection = 'connecting' | 'live' | 'offline'
type State = {
  owner: string | null; profile: Profile | null; requests: FriendRequest[]
  notifications: AppNotification[]; unread: UnreadCounts; loading: boolean
  connection: Connection; error: string | null
}
const initial: State = { owner: null, profile: null, requests: [], notifications: [], unread: { friend: 0, general: 0 }, loading: false, connection: 'connecting', error: null }
const SocialContext = createContext<State & { refresh: () => Promise<void> }>({ ...initial, refresh: async () => {} })
export function useSocial() { return useContext(SocialContext) }

export function SocialProvider({ children }: { children: ReactNode }) {
  const { session, recovery } = useAuth()
  const userId = session?.user.id
  const nickname = getNickname(session)
  const [state, setState] = useState<State>(initial)
  const refreshRef = useRef<() => Promise<void>>(async () => {})
  const refresh = useCallback(async () => { await refreshRef.current() }, [])
  useReturnNotifications(!recovery&&nickname?userId:undefined,refresh)

  useEffect(() => {
    if (!userId || !nickname || recovery) {
      setState(initial)
      refreshRef.current = async () => {}
      return
    }
    let active = true
    let revision = 0
    let channel: RealtimeChannel | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let profile: Profile | null = null
    let starting: Promise<void> | null = null
    const seen = new Set<string>()
    function announce(notification:AppNotification){
      if(seen.has(notification.id))return
      seen.add(notification.id)
      toast.info(notification.title, { id: notification.id, icon:<NotificationIcon notification={notification} className="size-7"/>, description: `${notification.category === 'notice'?'공지':notification.category === 'friend' ? '친구' : notification.category==='gift'?'선물':'소식'} · ${notification.body}`,action:notification.achievement_id?undefined:notification.harbor_voyage_id?{label:'항구 보기',onClick:()=>{window.location.assign('/port')}}:(notification.expedition_id||notification.expedition_boost_id)?{label:'통발 보기',onClick:()=>{window.location.assign('/expeditions')}}:notification.notice_id?{label:'공지 보기',onClick:()=>{window.location.assign(`/square/notices/${notification.notice_id}`)}}:notification.gift_id?{label:'선물 보기',onClick:()=>{window.location.assign(`/notifications?gift=${notification.gift_id}`)}}:undefined })
    }
    const client = createClient()
    setState({ ...initial, owner: userId, loading: true })

    async function load() {
      const version = ++revision
      try {
        const [requests, inbox, latestProfile] = await Promise.all([loadFriendRequests(), loadNotifications(userId!), loadProfile(userId!)])
        if (!active || version !== revision) return
        profile = latestProfile
        setState(previous => ({ ...previous, profile, requests, ...inbox, loading: false, error: null }))
        for(const notification of inbox.notifications){
          if(!notification.read_at&&(notification.expedition_id||notification.harbor_voyage_id))announce(notification)
        }
      } catch (cause) {
        if (active && version === revision) setState(previous => ({ ...previous, loading: false, error: socialErrorMessage(cause) }))
      }
    }
    const schedule = () => {
      if (!active) return
      clearTimeout(timer)
      timer = setTimeout(() => { void load() }, 120)
    }
    async function start() {
      if (!active) return
      if (channel) { await load(); return }
      if (starting) return starting
      starting = (async () => {
        try {
          profile = await syncProfile()
          if (!active) return
          setState(previous => ({ ...previous, profile }))
          channel = client.channel(`social:${userId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, payload => {
              if (!active) return
              const notification = payload.new as AppNotification
              if(notification.expedition_id||notification.expedition_boost_id)window.dispatchEvent(new Event('expedition-changed'))
              if(notification.harbor_voyage_id)window.dispatchEvent(new Event('harbor-changed'))
              if(notification.kind==='reward')window.dispatchEvent(new Event('wallet-changed'))
              announce(notification)
              schedule()
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, schedule)
          for (const column of ['sender_id', 'recipient_id']) {
            for (const event of ['INSERT', 'UPDATE'] as const) {
              channel.on('postgres_changes', { event, schema: 'public', table: 'friend_requests', filter: `${column}=eq.${userId}` }, schedule)
            }
          }
          channel.on('postgres_changes', { event: '*', schema: 'public', table: 'collectible_gifts', filter: `recipient_id=eq.${userId}` }, schedule)
          channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'player_profiles' }, schedule)
          channel.subscribe(status => {
            if (!active) return
            setState(previous => ({ ...previous, connection: status === 'SUBSCRIBED' ? 'live' : 'offline' }))
            if (status === 'SUBSCRIBED') schedule()
          })
          await load()
        } catch (cause) {
          if (active) setState(previous => ({ ...previous, loading: false, error: socialErrorMessage(cause), connection: 'offline' }))
        } finally { starting = null }
      })()
      return starting
    }
    const catchUp = () => { if (document.visibilityState !== 'hidden') void start() }
    const offline = () => { if (active) setState(previous => ({ ...previous, connection: 'offline' })) }
    refreshRef.current = start
    void start()
    window.addEventListener('focus', catchUp)
    window.addEventListener('online', catchUp)
    window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', catchUp)
    return () => {
      active = false
      clearTimeout(timer)
      if (channel) void client.removeChannel(channel)
      window.removeEventListener('focus', catchUp)
      window.removeEventListener('online', catchUp)
      window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', catchUp)
      refreshRef.current = async () => {}
    }
  }, [userId, nickname, recovery])
  // Avoid displaying an earlier account's private data during an account switch.
  const current = state.owner === userId && !recovery ? state : initial
  return <SocialContext.Provider value={{ ...current, refresh }}>{children}</SocialContext.Provider>
}
