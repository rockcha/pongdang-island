import type { OwnedCollectible } from '@/features/collection/api'
import { canArrangeSpecies } from './movement-settings'

export const aquariumWorldColumns = 3
export function clampTankView(view: number, columns = aquariumWorldColumns) {
  return Math.max(0, Math.min(columns - 1, Number.isFinite(view) ? view : 0))
}
export function draggedTankView(view: number, pointerX: number, viewportWidth: number, seconds: number, columns = aquariumWorldColumns) {
  const edge = Math.min(56, viewportWidth * .18)
  const direction = pointerX < edge ? -(1 - Math.max(0, pointerX) / edge)
    : pointerX > viewportWidth - edge ? 1 - Math.max(0, viewportWidth - pointerX) / edge : 0
  return clampTankView(view + direction * .6 * Math.min(.1, seconds), columns)
}
export function tankWorldItem(item: OwnedCollectible, viewportWidth: number, columns: number): OwnedCollectible {
  if (columns === 1) return item
  // A wider habitat does not enlarge fish or multiply their pixel speed.
  return { ...item, species: { ...item.species, size: Math.min(item.species.size, viewportWidth * .48), speed: Number(item.species.speed) / columns } }
}
export function tankItemSpace(item: OwnedCollectible, viewportWidth: number, columns: number, preserveArrangement = false) {
  const local = columns > 1 && preserveArrangement && canArrangeSpecies(item.species)
  return { width: local ? viewportWidth : viewportWidth * columns, offset: local ? viewportWidth * (columns - 1) / 2 : 0, local }
}

export type TankWorldFrame = {
  clock: number; view: number; width: number; viewportWidth: number; height: number
  inhabitants: { id: string; x: number; y: number; size: number; direction: number }[]
}
export type TankWorldOptions = {
  columns: 1 | 3
  initialView?: number
  onViewChange?: (view: number) => void
  onFrame?: (frame: TankWorldFrame) => void
  assetUrl?: (path: string) => string
  motionPaused?: () => boolean
  preserveArrangement?: boolean
  canPan?: () => boolean
}
