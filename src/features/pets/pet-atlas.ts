import type {PetClip} from './pet-catalog'
import {petBlinkStep, type createPetBlinkSchedule} from './pet-idle-animation'

// A row per resting emotion keeps its blink on the same pose. Reactions use
// the final row and return to a compatible pose before the care effect ends.
export function petAtlasFrame(clip: PetClip, elapsed: number, schedule: ReturnType<typeof createPetBlinkSchedule>, reduced = false) {
  const base = clip === 'hungry' ? 4 : clip === 'lonely' ? 8 : 0
  if (clip === 'happy' || clip === 'eat') {
    const start = clip === 'happy' ? 12 : 14
    return reduced ? start : start + [0,0,1,1,1,0,0,0][Math.min(7, Math.floor(Math.max(0,elapsed)/375))]
  }
  if (reduced) return base
  const blink = petBlinkStep(elapsed, schedule)
  return blink === null ? base + (clip === 'idleB' ? 1 : 0) : base + [1,2,1][blink]
}
