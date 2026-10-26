import { useAccountResource, useServerDeadlines } from '@/lib/account-query'
import { readMenuStatus } from '@/lib/menu-status'
export type ExpeditionStatus = 'sailing' | 'returned' | null
export function useExpeditionStatus(): ExpeditionStatus {
  const { data: summary, dataUpdatedAt } = useAccountResource('menu-status', readMenuStatus)
  const data = summary?.expedition
  const now = useServerDeadlines(summary?.serverNow, dataUpdatedAt, [data?.returnsAt])
  return !data?.returnsAt ? null : Date.parse(data.returnsAt) <= now ? 'returned' : 'sailing'
}
