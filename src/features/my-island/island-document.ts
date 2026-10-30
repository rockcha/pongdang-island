import type { IslandSnapshot, IslandDocument } from './api'
import type { IslandState, FloorKind } from './island-model'
import { floorTiles } from './island-model'
import { createDefaultIsland } from './owned-facilities'
export function materializeIsland(
  snapshot: IslandSnapshot,
  draft: IslandDocument | null = null,
): IslandState {
  const document = draft ?? snapshot.document
  const owned = new Set([
    ...snapshot.items.map((i) => i.id),
    ...snapshot.catalog.filter((i) => i.family === 'facility').map((i) => i.id),
  ])
  const layout = document.layout.filter((p) => owned.has(p.id))
  const tileStock: Record<string, number> = {}
  for (const tile of floorTiles)
    tileStock[tile.id] = Math.max(
      0,
      (snapshot.stocks['floor-' + tile.id] ?? 0) -
        document.paving.filter((p) => p.type === tile.id).length,
    )
  return {
    ...document,
    layout,
    owned: snapshot.items.map((i) => i.id),
    coins: 0,
    farmPlotLimit: snapshot.farm?.plotLimit,
    landStock: Math.max(
      0,
      (snapshot.stocks['land-piece'] ?? 0) -
        (784 - document.removedLand.length + document.land.length),
    ),
    tileStock,
  }
}
export function resetIslandDocument(snapshot?: IslandSnapshot): IslandDocument {
  const document = createDefaultIsland()
  if (snapshot) {
    if ((snapshot.stocks['land-piece'] ?? 0) < 775) throw Error('ISLAND_STOCK_REQUIRED')
    const used = new Set<string>(),
      signLabels: Record<string, string> = {},
      layout: IslandDocument['layout'] = []
    for (const p of document.layout) {
      if (p.id.includes('~owned:')) {
        if (snapshot.catalog.some((c) => c.id === p.id && c.family === 'facility')) layout.push(p)
        continue
      }
      const type = p.id.split('~')[0],
        candidates = snapshot.items.filter(
          (i) => i.type === type && i.sellPrice === 0 && !used.has(i.id),
        )
      const named = p.label
        ? candidates.find(
            (i) =>
              (snapshot.document.signLabels[i.id] ??
                snapshot.document.layout.find((old) => old.id === i.id)?.label) === p.label,
          )
        : undefined
      const item = named ?? candidates[0]
      if (!item) continue
      used.add(item.id)
      layout.push({ ...p, id: item.id })
      if (p.label !== undefined) signLabels[item.id] = p.label
    }
    const remaining = { ...snapshot.stocks },
      paving = document.paving.filter((p) => {
        const key = 'floor-' + p.type
        if ((remaining[key] ?? 0) <= 0) return false
        remaining[key]--
        return true
      })
    return { layout, land: document.land, removedLand: document.removedLand, paving, signLabels }
  }
  return {
    layout: document.layout.filter((p) => p.id.includes('~owned:')),
    land: document.land,
    removedLand: document.removedLand,
    paving: [],
    signLabels: {},
  }
}
export type IslandOffer =
  { kind: 'item'; type: string } | { kind: 'floor'; type: FloorKind } | { kind: 'land' }
export const islandProductId = (offer: IslandOffer) =>
  offer.kind === 'land' ? 'land-piece' : offer.kind === 'floor' ? 'floor-' + offer.type : offer.type
export function islandMaterialOffer(id: string): IslandOffer | null {
  if (id === 'land-piece') return { kind: 'land' }
  const floor = floorTiles.find((tile) => 'floor-' + tile.id === id)
  return floor ? { kind: 'floor', type: floor.id } : null
}
export function retainIslandSignLabels(previous: IslandState, next: IslandState): IslandState {
  const fromLayout = (state: IslandState) =>
    Object.fromEntries(
      state.layout.filter((p) => p.label !== undefined).map((p) => [p.id, p.label!]),
    )
  const labels = { ...fromLayout(previous), ...next.signLabels, ...fromLayout(next) }
  return {
    ...next,
    signLabels: Object.fromEntries(
      Object.entries(labels).filter(([id]) => next.owned.includes(id)),
    ),
  }
}
