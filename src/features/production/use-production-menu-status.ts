import { useAccountResource, useServerDeadlines } from '@/lib/account-query'
import { readMenuStatus } from '@/lib/menu-status'
export function useProductionMenuStatus(kind: 'fuel' | 'bait'): { ready: number; total: number } | null {
  const { data: summary, dataUpdatedAt } = useAccountResource('menu-status', readMenuStatus)
  const data = kind === 'fuel' ? summary?.production : summary?.baitProduction
  const sites = data?.sites ?? []
  const now = useServerDeadlines(summary?.serverNow, dataUpdatedAt, sites.flatMap(site => [site.completesAt, site.expiresAt]))
  return data ? { ready: sites.filter(site => site.completesAt && site.expiresAt && Date.parse(site.completesAt) <= now && now < Date.parse(site.expiresAt)).length, total: data.total } : null
}
