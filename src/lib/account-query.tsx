import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useId,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/auth-provider'
import {
  accountOptions,
  accountQueryKey,
  appQueryClient,
  subscribeResourceEvents,
  getQueryAccount,
  isCurrentAccount,
  type AccountResource,
} from './account-cache'

export function AppQueryProvider({ children }: { children: ReactNode }) {
  useEffect(subscribeResourceEvents, [])
  useEffect(()=>{
    const refresh=()=>{
      if(!document.hidden)void appQueryClient.refetchQueries({type:'active',predicate:q=>q.queryKey[2]==='new-content'},{cancelRefetch:false})
    }
    const timer=setInterval(refresh,60_000)
    window.addEventListener('focus',refresh)
    window.addEventListener('online',refresh)
    return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh)}
  },[])
  useEffect(()=>{
    const timer=setInterval(()=>{
      if(!document.hidden)void appQueryClient.refetchQueries({type:'active',predicate:q=>['merchant','menu-status'].includes(String(q.queryKey[2]))},{cancelRefetch:false})
    },30_000)
    return()=>clearInterval(timer)
  },[])
  useEffect(() => {
    const poll = setInterval(() => {
      if (!document.hidden)
        void appQueryClient.refetchQueries(
          { type: 'active', stale: true },
          { cancelRefetch: false },
        )
    }, 300_000)
    return () => clearInterval(poll)
  }, [])
  return <QueryClientProvider client={appQueryClient}>{children}</QueryClientProvider>
}

export function useAccountResource<T>(
  resource: AccountResource,
  read: (signal: AbortSignal) => Promise<T>,
  options: { enabled?: boolean; standalone?: boolean; previewId?: string } = {},
) {
  const { session, recovery } = useAuth()
  const owner = session?.user.id
  const instance = useId()
  const standalone = import.meta.env.DEV && !!options.standalone && !getQueryAccount()
  useEffect(subscribeResourceEvents, [])
  const result = useQuery(
    {
      ...accountOptions(
        standalone ? `preview:${options.previewId ?? instance}` : (owner ?? 'guest'),
        resource,
        read,
      ),
      enabled: options.enabled !== false && (!!owner || standalone) && !recovery,
      ...(standalone ? { gcTime: 0, staleTime: 0 } : {}),
    },
    appQueryClient,
  )
  // Preserve Query's tracked properties so a balance consumer need not render
  // for unrelated observer flags such as a background fetch starting.
  const refetch = result.refetch
  useEffect(() => {
    if (!standalone || options.enabled === false) return
    const refresh = () => {
      if (!document.hidden) void refetch({ cancelRefetch: false })
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [standalone, options.enabled, refetch])
  return (owner || standalone) && !recovery ? result : { ...result, data: undefined }
}

/** Cache-backed compatibility for screens that patch confirmed partial entity responses. */
export function useAccountState<T>(
  resource: AccountResource,
  read: (signal: AbortSignal) => Promise<T>,
  options: { enabled?: boolean } = {},
) {
  const instance = useId(),
    { session } = useAuth(),
    started = getQueryAccount()
  const query = useAccountResource(resource, read, {
    ...options,
    standalone: true,
    previewId: instance,
  })
  const owner = started ? session?.user.id : `preview:${instance}`
  const key = useMemo(() => accountQueryKey(owner ?? 'guest', resource), [owner, resource])
  const setValue = useCallback(
    (action: SetStateAction<T | null>) => {
      if (!isCurrentAccount(started)) return
      if (!owner) return
      void appQueryClient.cancelQueries({ queryKey: key })
      appQueryClient.setQueryData<T | null>(key, (current) =>
        typeof action === 'function'
          ? (action as (current: T | null) => T | null)(current ?? null)
          : action,
      )
    },
    [started, owner, key],
  )
  return [query.data ?? null, setValue, query] as const
}

/** Re-evaluate known deadlines without making another request. Preserve the original server clock. */
export function useServerDeadlines(
  serverNow: string | undefined,
  sampledAt: number,
  deadlines: (string | null | undefined)[],
) {
  const [, tick] = useState(0)
  const now = serverNow ? Date.parse(serverNow) + Math.max(0, Date.now() - sampledAt) : Date.now()
  const next = deadlines
    .map((value) => Date.parse(value ?? ''))
    .filter((value) => value > now)
    .sort((a, b) => a - b)[0]
  useEffect(() => {
    if (!next) return
    const timer = setTimeout(
      () => tick((value) => value + 1),
      Math.min(Math.max(next - now + 1, 1), 2147483647),
    )
    return () => clearTimeout(timer)
  }, [next, now])
  return now
}
