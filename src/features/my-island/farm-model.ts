import type { Facility, IslandState } from './island-model'

export const farmCategories = [
  { id: 'decoration', label: '장식물' },
  { id: 'building', label: '건물' },
  { id: 'floor', label: '타일' },
  { id: 'plot', label: '밭' },
  { id: 'land', label: '땅 추가' },
] as const
export type FarmCategory = (typeof farmCategories)[number]['id']
export function farmCategory(f: Facility): FarmCategory | null {
  if (f.kind === 'farm-office') return 'building'
  if (f.kind === 'farm-plot') return 'plot'
  return f.category === 'decoration' ? 'decoration' : null
}
/** Fit the current land, including older custom islands, without changing their layout. */
export function farmCamera(state: Pick<IslandState, 'land' | 'removedLand'>, width: number, height: number) {
  const removed = new Set(state.removedLand.map(p => `${p.x},${p.y}`))
  const cells = [...state.land]
  for (let y = 3; y < 31; y++) for (let x = 6; x < 34; x++)
    if (!removed.has(`${x},${y}`)) cells.push({ x, y })
  if (!cells.length) return { x: 640, y: 576, zoom: 1 }
  const xs = cells.map(c => c.x), ys = cells.map(c => c.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const fit = Math.min(width / 1280, height / 1152)
  const scale = Math.min(Math.max(180, width - 60) / ((maxX - minX + 3) * 32), Math.max(140, height - 240) / ((maxY - minY + 3) * 32))
  return { x: (minX + maxX + 1) * 16, y: (minY + maxY + 1) * 16, zoom: scale / fit }
}
