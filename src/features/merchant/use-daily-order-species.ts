import { useAccountResource } from '@/lib/account-query'
import { readMerchant } from './api'

export function useDailyOrderSpecies(open: boolean) {
  const { data: state } = useAccountResource('merchant', readMerchant, { enabled: open })
  return new Set(state?.orders.filter((order) => !order.completed)
    .flatMap((order) => order.items.map((item) => item.speciesId)) ?? [])
}
