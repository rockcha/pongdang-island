import {
  isLand,
  type Cell,
  type IslandState,
  type Placement,
  footprint,
  facilityFor,
  canPlace,
} from '../my-island/island-model'
import { farmAnimalIds } from './model'
// One orthographic ground plane for rendering, placement previews and pointer picking.
export const FARM_TILE = { width: 64, height: 36 } as const
export function toIso(x: number, y: number) {
  return { x: ((x - y) * FARM_TILE.width) / 2, y: ((x + y) * FARM_TILE.height) / 2 }
}
export function fromIso(x: number, y: number) {
  return {
    x: x / FARM_TILE.width + y / FARM_TILE.height,
    y: y / FARM_TILE.height - x / FARM_TILE.width,
  }
}
export function tilePoints(x: number, y: number, w = 1, h = 1) {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
    .map(([a, b]) => {
      const p = toIso(a, b)
      return `${p.x},${p.y}`
    })
    .join(' ')
}
export function landCells(state: Pick<IslandState, 'land' | 'removedLand'>) {
  const cells: Cell[] = []
  for (let y = 0; y < 36; y++)
    for (let x = 0; x < 40; x++)
      if (isLand(x, y, state.land, state.removedLand)) cells.push({ x, y })
  return cells
}
export function farmBounds(state: Pick<IslandState, 'land' | 'removedLand'>) {
  const pts = landCells(state).flatMap((c) => [
    toIso(c.x, c.y),
    toIso(c.x + 1, c.y + 1),
    toIso(c.x + 1, c.y),
    toIso(c.x, c.y + 1),
  ])
  const xs = pts.map((p) => p.x),
    ys = pts.map((p) => p.y)
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys) - 100,
    bottom: Math.max(...ys) + 40,
  }
}
export function depth(p: Placement) {
  const s = footprint(p)
  return p.x + p.y + (s.w + s.h) / 2
}
/** Keep the ground-contact corner fixed when rectangular objects turn. */
export function turnPlacement(p: Placement, rotation: number) {
  const before = footprint(p),
    after = footprint({ ...p, rotation })
  return { ...p, rotation, x: p.x + before.w - after.w, y: p.y + before.h - after.h }
}
export function canPlaceFarm(state: IslandState, p: Placement, animalLimit: number) {
  if (!canPlace(state.layout, p, state.land, state.removedLand, state.farmPlotLimit)) return false
  const f = facilityFor(p.id)
  return (
    !farmAnimalIds.includes(f?.id ?? '') ||
    state.layout.filter(
      (old) => old.id !== p.id && farmAnimalIds.includes(facilityFor(old.id)?.id ?? ''),
    ).length < animalLimit
  )
}
