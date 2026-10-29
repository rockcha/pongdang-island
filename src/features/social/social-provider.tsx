import {NotificationIcon} from '@/features/notifications/notification-icon'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { getNickname, useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/client'
import { hasBackgroundSession, isAuthFailure } from '@/lib/background-session'
import { accountOptions, appQueryClient, accountQueryKey } from '@/lib/account-cache'
import { loadFriendRequests, loadProfile, syncProfile } from '@/features/friends/api'
import { loadNotifications } from '@/features/notifications/api'
import {useReturnNotifications} from '@/features/notifications/use-return-notifications'
import {announceCompletion} from '@/features/notifications/foreground-notice'
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
    let loading: Promise<void> | null = null
    let reloadPending = false
    let authBlocked = false
    const seen = new Set<string>()
    const reconciledHarvests = new Set<string>()
    function reconcileHarvests(notifications:AppNotification[]){
      let changed=false
      for(const notification of notifications){
        if(notification.recipient_id!==userId||!notification.production_auto_claim||reconciledHarvests.has(notification.id))continue
        reconciledHarvests.add(notification.id);changed=true
        if(reconciledHarvests.size>500)reconciledHarvests.delete(reconciledHarvests.values().next().value!)
      }
      if(changed)for(const event of ['wallet-changed','production-changed','bait-production-changed'])window.dispatchEvent(new Event(event))
    }
    function announce(notification:AppNotification){
      if(seen.has(notification.id))return
      seen.add(notification.id)
      if(announceCompletion(notification))return
      toast.info(notification.title, { id: notification.id, icon:<NotificationIcon notification={notification} className="size-7"/>, description: `${notification.category === 'notice'?'공지':notification.category === 'friend' ? '친구' : notification.category==='gift'?'선물':'소식'} · ${notification.body}`,action:notification.achievement_id?undefined:notification.harbor_voyage_id?{label:'항구 보기',onClick:()=>{window.location.assign('/port')}}:(notification.expedition_id||notification.expedition_boost_id)?{label:'통발 보기',onClick:()=>{window.location.assign('/expeditions')}}:notification.notice_id?{label:'공지 보기',onClick:()=>{window.location.assign(`/square/notices/${notification.notice_id}`)}}:notification.gift_id?{label:'선물 보기',onClick:()=>{window.location.assign(`/notifications?gift=${notification.gift_id}`)}}:undefined })
    }
    const client = createClient()
    setState({ ...initial, owner: userId, loading: true })

    async function loadOnce() {
      const version = ++revision
      try {
        if (authBlocked || !await hasBackgroundSession(userId!) || !active) return
        const [requests, inbox, latestProfile] = await Promise.all([
          appQueryClient.fetchQuery(accountOptions(userId!, 'friend-requests', () => loadFriendRequests())),
          loadNotifications(userId!),
          appQueryClient.fetchQuery(accountOptions(userId!, 'profile', () => loadProfile(userId!))),
        ])
        if (!active || version !== revision) return
        profile = latestProfile
        setState(previous => ({ ...previous, profile, requests, ...inbox, loading: false, error: null }))
        reconcileHarvests(inbox.notifications)
        for(const notification of inbox.notifications){
          if(!notification.read_at&&(notification.expedition_id||notification.harbor_voyage_id))announce(notification)
        }
      } catch (cause) {
        authBlocked = isAuthFailure(cause)
        if (active && version === revision) setState(previous => ({ ...previous, loading: false, error: socialErrorMessage(cause) }))
      }
    }
    async function load(): Promise<void> {
      if (!active || authBlocked) return
      if (loading) { reloadPending = true; return loading }
      loading = loadOnce()
      try { await loading } finally {
        loading = null
        if (reloadPending && active) { reloadPending = false; schedule() }
      }
    }
    const schedule = () => {
      if (!active) return
      for (const resource of ['inbox', 'friend-requests']) void appQueryClient.invalidateQueries({ queryKey: accountQueryKey(userId, resource), refetchType: 'none' })
      clearTimeout(timer)
      timer = setTimeout(() => { void load() }, 120)
    }
    async function start() {
      if (!active) return
      if (channel) { await load(); return }
      if (starting) return starting
      starting = (async () => {
        try {
          if (authBlocked || !await hasBackgroundSession(userId!) || !active) return
          profile = await syncProfile()
          if (!active) return
          setState(previous => ({ ...previous, profile }))
          channel = client.channel(`social:${userId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, payload => {
              if (!active) return
              const notification = payload.new as AppNotification
              reconcileHarvests([notification])
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
          channel.subscribe(status => {
            if (!active) return
            setState(previous => ({ ...previous, connection: status === 'SUBSCRIBED' ? 'live' : 'offline' }))
            if (status === 'SUBSCRIBED') { clearTimeout(timer); timer = setTimeout(() => { void load() }, 120) }
          })
          await load()
        } catch (cause) {
          authBlocked = isAuthFailure(cause)
          if (active) setState(previous => ({ ...previous, loading: false, error: socialErrorMessage(cause), connection: 'offline' }))
        } finally { starting = null }
      })()
      return starting
    }
    const catchUp = () => { if (document.visibilityState !== 'hidden') void start() }
    const offline = () => { if (active) setState(previous => ({ ...previous, connection: 'offline' })) }
    const {data:{subscription}} = client.auth.onAuthStateChange(() => { authBlocked = false })
    refreshRef.current = async () => {
      for (const resource of ['inbox', 'friend-requests']) void appQueryClient.invalidateQueries({ queryKey: accountQueryKey(userId, resource), refetchType: 'none' })
      await start()
    }
    void start()
    window.addEventListener('focus', catchUp)
    window.addEventListener('online', catchUp)
    window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', catchUp)
    return () => {
      active = false
      subscription.unsubscribe()
      clearTimeout(timer)
      if (channel) void client.removeChannel(channel)
      window.removeEventListener('focus', catchUp)
      window.removeEventListener('online', catchUp)
      window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', catchUp)
      refreshRef.current = async () => {}
    }
  }, [userId, nickname, recovery])
  const profileIds = state.owner === userId && userId
    ? [...new Set([userId, ...state.requests.flatMap(request => [request.sender_id, request.recipient_id])])].sort().join(',')
    : ''
  useEffect(() => {
    if (!profileIds || recovery) return
    const client = createClient(), ids = profileIds.split(',')
    let active = true
    const channels: RealtimeChannel[] = []
    for (let start = 0; start < ids.length; start += 100) {
      const chunk = ids.slice(start, start + 100)
      const channel = client.channel(`social-profiles:${userId}:${start}`)
        .on('postgres_changes', {event:'UPDATE',schema:'public',table:'player_profiles',filter:`id=in.(${chunk.join(',')})`}, payload => {
          if (!active) return
          const changed = payload.new as Profile
          appQueryClient.setQueryData<Profile>(accountQueryKey(userId!, 'profile'), previous =>
            previous?.id === changed.id ? { ...previous, ...changed } : previous)
          appQueryClient.setQueryData<FriendRequest[]>(accountQueryKey(userId!, 'friend-requests'), previous => previous?.map(request => ({
            ...request,
            sender: request.sender.id === changed.id ? { ...request.sender, ...changed } : request.sender,
            recipient: request.recipient.id === changed.id ? { ...request.recipient, ...changed } : request.recipient,
          })))
          setState(previous => {
            if (previous.owner !== userId) return previous
            return {...previous,
              profile: previous.profile?.id === changed.id ? {...previous.profile,...changed} : previous.profile,
              requests: previous.requests.map(request => ({...request,
                sender: request.sender.id === changed.id ? {...request.sender,...changed} : request.sender,
                recipient: request.recipient.id === changed.id ? {...request.recipient,...changed} : request.recipient,
              })),
            }
          })
        }).subscribe()
      channels.push(channel)
    }
    return () => { active = false; for (const channel of channels) void client.removeChannel(channel) }
  }, [profileIds, userId, recovery])
  // Avoid displaying an earlier account's private data during an account switch.
  const current = state.owner === userId && !recovery ? state : initial
  return <SocialContext.Provider value={{ ...current, refresh }}>{children}</SocialContext.Provider>
}
