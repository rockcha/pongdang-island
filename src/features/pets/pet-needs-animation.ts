import type { PetSpeciesId } from './pet-catalog'

const pauseBySpecies: Record<PetSpeciesId, number> = {
  'sand-golem': 10_000,
  'wave-cat': 8_000,
  'mochi-dragon': 12_000,
  'jelly-seal': 9_000,
}
// Keep the emotional resting pose between brief, slow gestures. Each state
// owns one row; returning to pose zero avoids an abrupt final-to-first jump.
export function petNeedsFrame(
  elapsed: number,
  speciesId: PetSpeciesId,
  state: 'hungry' | 'lonely',
  reduced = false,
) {
  const base = state === 'hungry' ? 0 : 4
  if (reduced) return base
  const pause = pauseBySpecies[speciesId]
  const at = Math.max(0, elapsed) % (pause + 3600)
  if (at < pause) return base
  return base + [1, 2, 3, 0][Math.min(3, Math.floor((at - pause) / 900))]
}
