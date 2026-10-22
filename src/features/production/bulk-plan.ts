import type { ProductionFacility, ProductionMaterial } from './api'
import { productionSiteKey } from './api'

export type BulkStep = { facility: string; materials: Record<string, number> }
export type BulkAction = 'start' | 'claim' | 'discard'
export type PlannedMaterial = ProductionMaterial & { quantity: number }
export function planProductionStart(
  sites: ProductionFacility[],
  stock: Record<string, ProductionMaterial[]>,
) {
  const ordered = [...sites].sort(
    (a, b) => a.price - b.price || productionSiteKey(a).localeCompare(productionSiteKey(b)),
  )
  const pools = new Map(
    Object.entries(stock).map(([kind, rows]) => [
      kind,
      [...rows]
        .sort((a, b) => a.sell_price - b.sell_price || a.id.localeCompare(b.id))
        .map((m) => ({ ...m })),
    ]),
  )
  const used = new Map<string, PlannedMaterial>(),
    steps: BulkStep[] = []
  for (const site of ordered) {
    let left = site.input_count
    const materials: Record<string, number> = {}
    for (const m of pools.get(site.kind) ?? []) {
      const take = Math.min(left, m.available)
      if (!take) continue
      materials[m.id] = take
      m.available -= take
      left -= take
      const previous = used.get(m.id)
      used.set(m.id, { ...m, quantity: (previous?.quantity ?? 0) + take })
      if (!left) break
    }
    if (left) throw new Error('INSUFFICIENT_MATERIALS')
    steps.push({ facility: productionSiteKey(site), materials })
  }
  const materials = [...used.values()].sort(
    (a, b) => a.sell_price - b.sell_price || a.id.localeCompare(b.id),
  )
  return {
    steps,
    materials,
    valuable: materials.filter((m) => m.rarity === 'epic' || m.rarity === 'mythic'),
  }
}
