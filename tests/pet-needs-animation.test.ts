import { expect, it } from 'vitest'
import { petNeedsFrame } from '@/features/pets/pet-needs-animation'
import { petSpecies } from '@/features/pets/pet-catalog'

it.each(petSpecies)('holds clear emotional poses and plays slow gestures for $name', pet => {
  for (const state of ['hungry','lonely'] as const) {
    const base = state === 'hungry' ? 0 : 4
    const frames = Array.from({length: 16001}, (_,t) => petNeedsFrame(t,pet.id,state))
    const first = frames.findIndex(f => f !== base)
    expect(first).toBeGreaterThanOrEqual(8000)
    expect(first).toBeLessThanOrEqual(12000)
    expect(frames.slice(first,first + 900).every(f => f === base + 1)).toBe(true)
    expect(frames.slice(first + 900,first + 1800).every(f => f === base + 2)).toBe(true)
    expect(frames.slice(first + 1800,first + 2700).every(f => f === base + 3)).toBe(true)
    expect(frames[first + 2700]).toBe(base)
    for (const t of [0,first,first + 2000,60_000]) expect(petNeedsFrame(t,pet.id,state,true)).toBe(base)
  }
})
