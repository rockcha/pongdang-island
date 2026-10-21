import { loadCollectibleStorage } from '@/features/aquarium/api'
import type { OwnedCollectible } from '@/features/collection/api'
import type { FishingAttempt } from './api'

// Resolve actual storage rows, rather than treating a local catch history as ownership.
export async function loadTripStorage(catches: FishingAttempt[], active = () => true, sellableOnly = true) {
  const ids = new Set(catches.flatMap((c) => (c.collectible_id ? [c.collectible_id] : [])))
  if (!ids.size) return []
  const times = catches.map((c) => Date.parse(c.created_at)).filter(Number.isFinite)
  const earliest = times.length === catches.length ? Math.min(...times) : -Infinity
  const found = new Map<string, OwnedCollectible>()
  for (let offset = 0; active();) {
    const page = await loadCollectibleStorage(offset)
    if (!active()) return []
    for (const item of page.items) if (ids.has(item.id)) found.set(item.id, item)
    offset += page.items.length
    if (!page.items.length || offset >= page.total || found.size === ids.size) break
    // Storage is newest first. Older rows cannot belong to this fishing trip.
    const oldest = Date.parse(page.items[page.items.length - 1].acquired_at)
    if (oldest < earliest) break
  }
  return [...found.values()].filter(
    (item) => !sellableOnly || (item.species.kind !== 'map' && item.species.sell_price > 0),
  )
}
