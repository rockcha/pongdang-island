import { useEffect, useState, type ReactNode } from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/auth-provider'
import { accountOptions, appQueryClient, subscribeResourceEvents } from './account-cache'

export function AppQueryProvider({ children }: { children: ReactNode }) {
  useEffect(subscribeResourceEvents, [])
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

export function useAccountResource<T>(resource: string, read: (signal: AbortSignal) => Promise<T>) {
  const { session, recovery } = useAuth()
  const owner = session?.user.id
  useEffect(subscribeResourceEvents, [])
  const result = useQuery(
    {
      ...accountOptions(owner ?? 'guest', resource, read),
      enabled: !!owner && !recovery,
    },
    appQueryClient,
  )
  // Preserve Query's tracked properties so a balance consumer need not render
  // for unrelated observer flags such as a background fetch starting.
  return owner && !recovery ? result : { ...result, data: undefined }
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
