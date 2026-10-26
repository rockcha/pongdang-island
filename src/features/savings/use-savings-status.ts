import { useAccountResource, useServerDeadlines } from '@/lib/account-query'
import { readMenuStatus } from '@/lib/menu-status'
import { savingsStatus } from './savings-time'

export type SavingsMenuStatus = '미납' | '수령 가능' | null
export function useSavingsStatus(): SavingsMenuStatus {
  const { data: summary, dataUpdatedAt } = useAccountResource('menu-status', readMenuStatus)
  const data = summary?.savings
  const account = data?.account
  const now = useServerDeadlines(summary?.serverNow, dataUpdatedAt, account && !account.closed_at
    ? [account.nextOpenAt, account.depositDeadline, account.maturesAt] : [])
  const status = account ? savingsStatus(account, now) : null
  return status === 'matured' ? '수령 가능' : status === 'due' || status === 'missed' ? '미납' : null
}
