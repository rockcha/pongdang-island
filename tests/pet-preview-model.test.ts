import { describe, expect, it } from 'vitest'
import {
  createPetPreview,
  drawPetCatch,
  petIsWorking,
  petNeedsAt,
  petPreviewReducer,
  restorePetPreview,
  type PetPreviewAction,
  type PetPreviewState,
} from '@/features/pets/pet-preview-model'
import { petBaits, petJobs, PET_DECAY_MS as D } from '@/features/pets/pet-catalog'
const now = 1_800_000_000_000
const jobReady = (level=4) => { const s=createPetPreview(now); s.pets[0].level=level; return s }
const step = (
  s: PetPreviewState,
  a: Omit<PetPreviewAction, 'now'> | Record<string, unknown>,
  at = now,
) => petPreviewReducer(s, { ...a, now: at } as PetPreviewAction)
describe('operator pet sandbox', () => {
  it('starts with all four species and one displayed pet', () => {
    const s = createPetPreview(now)
    expect(new Set(s.pets.map((p) => p.speciesId)).size).toBe(4)
    expect(s.pets.filter((p) => p.id === s.activeId)).toHaveLength(1)
  })
  it('decays every ten minutes, preserves the partial interval, clamps at zero', () => {
    const p = createPetPreview(now).pets[0]
    const halfway = petNeedsAt(p, now + 1.5 * D)
    expect(halfway.fullness).toBe(99)
    expect(petNeedsAt(halfway, now + 2 * D).fullness).toBe(98)
    expect(petNeedsAt(p, now + 200 * D).affection).toBe(0)
  })
  it('restores offline decay on all stored and working pets', () => {
    let s = step(jobReady(), { type: 'start-job', jobId: 'lighthouse', roll: 0 })
    s = restorePetPreview(JSON.stringify(s), now + 12 * 3600000)
    expect(s.pets.map((p) => p.fullness)).toEqual([28, 28, 28, 28])
    expect(petIsWorking(s.pets[0], now + 12 * 3600000)).toBe(false)
    expect(s.activeId).toBe(s.pets[0].id)
  })
  it('requires both needs only at departure and limits the whole account to one job', () => {
    let s = step(jobReady(), { type: 'set-needs', fullness: 80, affection: 79 })
    s = step(s, { type: 'start-job', jobId: 'bakery', roll: 0 })
    expect(s.pets[0].job).toBeNull()
    s = step(s, { type: 'set-needs', fullness: 80, affection: 80 })
    s = step(s, { type: 'start-job', jobId: 'lighthouse', roll: 0 })
    s = step(s, { type: 'select', id: s.pets[1].id })
    s = step(s, { type: 'start-job', jobId: 'dock', roll: 0 })
    expect(s.pets.filter((p) => p.job)).toHaveLength(1)
    s = step(s, { type: 'advance', milliseconds: 12 * 3600000 })
    expect(s.pets[0].fullness).toBe(8)
    const gold = s.gold
    s = step(s, { type: 'claim-job', id: s.pets[0].id }, s.lastNow)
    expect(s.gold - gold).toBe(2200)
    expect(step(s, { type: 'claim-job', id: s.pets[0].id }, s.lastNow).gold).toBe(s.gold)
  })
  it.each(petJobs)('samples inclusive reward endpoints for $id', (j) => {
    for (const [roll, reward] of [
      [0, j.min],
      [0.999999, j.max],
    ]) {
      const s = step(jobReady(j.requiredLevel), { type: 'start-job', jobId: j.id, roll })
      expect(s.pets[0].job?.reward).toBe(reward)
      expect(s.pets[0].job!.endsAt-s.pets[0].job!.startedAt).toBe(j.minutes*60000)
    }
  })
  it('blocks feeding, care and sale while working', () => {
    let s = step(jobReady(), { type: 'start-job', jobId: 'dock', roll: 0 })
    const id = s.activeId
    s = step(s, { type: 'feed' }, now + D)
    s = step(s, { type: 'care', action: 'bath', id: 'a' }, now + D)
    s = step(s, { type: 'sell', id }, now + D)
    expect(s.food).toBe(10)
    expect(s.pets[0].fullness).toBe(99)
    expect(s.care).toBeNull()
    expect(s.pets).toHaveLength(4)
  })
  it('locks interactions and awards affection once after the reaction ends', () => {
    let s = step(createPetPreview(now), { type: 'set-needs', fullness: 50, affection: 50 })
    s = step(s, { type: 'care', action: 'stroke', id: 'first' })
    s = step(s, { type: 'care', action: 'play', id: 'spam' })
    expect(s.care?.id).toBe('first')
    s = step(s, { type: 'complete-care', id: 'first' }, now + 2999)
    expect(s.pets[0].affection).toBe(50)
    s = step(s, { type: 'complete-care', id: 'wrong' }, now + 3000)
    expect(s.pets[0].affection).toBe(50)
    s = step(s, { type: 'complete-care', id: 'first' }, now + 3000)
    expect(s.pets[0].affection).toBe(90)
    s = step(s, { type: 'complete-care', id: 'first' }, now + 3001)
    expect(s.pets[0].affection).toBe(90)
    s = step(s, { type: 'care', action: 'sleep', id: 'next' }, now + 3001)
    expect(s.care?.id).toBe('next')
  })
  it('cancels an unfinished interaction on reload without awarding affection', () => {
    let s = step(createPetPreview(now), { type: 'set-needs', fullness: 50, affection: 50 })
    s = step(s, { type: 'care', action: 'bath', id: 'first' })
    const restored = restorePetPreview(JSON.stringify(s), now + 4000)
    expect(restored.care).toBeNull()
    expect(restored.pets[0].affection).toBe(50)
  })
  it('feeds forty capped at 100, charges food purchases and sales only in the sandbox', () => {
    let s = step(createPetPreview(now), { type: 'set-needs', fullness: 95, affection: 50 })
    s = step(s, { type: 'feed' })
    expect(s.pets[0].fullness).toBe(95)
    expect(s.food).toBe(10)
    const feeding = s.care!
    s = step(s, { type: 'feed' })
    expect(s.care?.id).toBe(feeding.id)
    s = step(s, { type: 'complete-care', id: feeding.id }, now + 2999)
    expect(s.food).toBe(10)
    s = step(s, { type: 'complete-care', id: feeding.id }, now + 3000)
    expect(s.pets[0].fullness).toBe(100)
    expect(s.food).toBe(9)
    expect(s.pets[0].affection).toBe(50)
    s = step(s, { type: 'complete-care', id: feeding.id }, now + 3000)
    expect(s.food).toBe(9)
    s = step(s, { type: 'buy-food' })
    expect(s.food).toBe(10)
    expect(s.gold).toBe(9950)
    s = step(s, { type: 'sell', id: s.activeId })
    expect(s.gold).toBe(10950)
    expect(s.activeId).toBeNull()
  })
  it('allows duplicate species and enforces custom-name length', () => {
    let s = step(createPetPreview(now), { type: 'add-pet', speciesId: 'wave-cat' })
    expect(s.pets.filter((p) => p.speciesId === 'wave-cat')).toHaveLength(2)
    s = step(s, { type: 'rename', id: s.activeId, name: '  작은 파도  ' })
    expect(s.pets[0].name).toBe('작은 파도')
    expect(step(s, { type: 'rename', id: s.activeId, name: 'a'.repeat(13) }).pets[0].name).toBe(
      '작은 파도',
    )
  })
  it.each(petBaits)('uses one draw totaling 100% for $id', (b) => {
    expect(b.petBp + b.commonBp + b.rareBp + b.epicBp + b.mythicBp).toBe(10000)
    expect(drawPetCatch(b.id, 0)).toBe('pet')
    expect(drawPetCatch(b.id, (b.petBp - 1) / 10000)).toBe('pet')
    expect(drawPetCatch(b.id, b.petBp / 10000)).toBe('common')
    expect(drawPetCatch(b.id, 0.999999)).toBe('mythic')
    for (let i = 0; i < 4; i++) {
      const s = step(createPetPreview(now), {
        type: 'fish',
        baitId: b.id,
        roll: 0,
        speciesRoll: i / 4,
      })
      expect(s.pets).toHaveLength(5)
      expect(s.pets[4].speciesId).toBe(s.pets[i].speciesId)
      expect(s.gold).toBe(10000 - b.price)
    }
  })
  it('rejects corrupt saves and cannot roll back its time', () => {
    expect(restorePetPreview('{bad', now)).toEqual(createPetPreview(now))
    const s = step(createPetPreview(now), { type: 'advance', milliseconds: 3600000 })
    expect(step(s, { type: 'buy-food' }, now).lastNow).toBe(s.lastNow)
  })
})
