import { createClient } from './client'
import type { SavingsAccount } from '@/features/savings/api'
type Production = {
  total: number
  sites: { completesAt: string | null; expiresAt: string | null }[]
}
export type MenuStatus = {
  serverNow: string
  production: Production
  baitProduction: Production
  harbor: { total?: number; dockSlots: number; returnsAt: string[] }
  expedition: { returnsAt: string | null }
  personalBait?: { completesAt: string | null }
  savings: { account: SavingsAccount | null }
  merchant?: { ready: number; total: number; availableAt: string | null; resetsAt: string }
  flea?: { sellable: number }
}
export async function readMenuStatus(signal: AbortSignal): Promise<MenuStatus> {
  const { data, error } = await createClient().rpc('menu_status').abortSignal(signal)
  if (error) throw error
  return data
}
