import { createClient } from '@/lib/client'
import type { Rarity } from '@/lib/game/rarity'

export type TodayFishingRecords = {
  serverNow: string
  day: string
  nextResetAt: string
  totalCasts: number
  caughtCount: number
  failedCount: number
  unfinishedCount: number
  rarities: Record<Rarity, number>
  baits: { id: string; name: string; imagePath: string | null; used: number }[]
}
export async function readTodayFishingRecords(signal: AbortSignal): Promise<TodayFishingRecords> {
  const { data, error } = await createClient().rpc('today_fishing_records').abortSignal(signal)
  if (error) throw error
  return data
}
