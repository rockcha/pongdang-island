import { useAccountResource, useServerDeadlines } from '@/lib/account-query'
import { readMenuStatus } from '@/lib/menu-status'
export type HarborStatus = { ready: number; total: number }
export function useHarborStatus(): HarborStatus | null {
  const { data: summary, dataUpdatedAt } = useAccountResource('menu-status', readMenuStatus)
  const data = summary?.harbor
  const trips = data?.returnsAt ?? []
  const now = useServerDeadlines(summary?.serverNow, dataUpdatedAt, trips)
  return data ? { ready: trips.filter(voyage => Date.parse(voyage) <= now).length, total: data.dockSlots ?? 2 } : null
}
