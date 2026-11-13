import { afterEach, expect, it, vi } from 'vitest'
import { createDefenseAudio } from '@/features/arcade/tower-defense-audio'
const prefs = vi.hoisted(() => ({ sound: true, volume: 40 }))
vi.mock('@/features/audio/audio-preferences', () => ({
  audioVolume: () => prefs.volume,
  audioVolumeChanged: 'test-volume',
}))
vi.mock('@/features/fishing/sound-preference', () => ({
  readFishingSound: () => prefs.sound,
  fishingSoundChanged: 'test-sound',
}))
const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
afterEach(() => {
  prefs.sound = true
  prefs.volume = 40
  vi.unstubAllGlobals()
})
it('unlocks on input, plays purchase and impact feedback, bounds impact bursts and disposes sources', () => {
  const gains: any[] = [],
    tones: any[] = []
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  })
  let ctx: any
  class Context {
    currentTime = 0
    state = 'running'
    destination = {}
    close = vi.fn().mockResolvedValue(undefined)
    constructor() {
      ctx = this
    }
    createGain() {
      const n = { ...node(), gain: param() }
      gains.push(n)
      return n
    }
    createOscillator() {
      const n = { ...node(), frequency: param() }
      tones.push(n)
      return n
    }
  }
  vi.stubGlobal('AudioContext', Context)
  const audio = createDefenseAudio()
  window.dispatchEvent(new Event('pointerdown'))
  expect(ctx).toBeTruthy()
  audio.play('purchase')
  audio.play('breach')
  audio.play('breach')
  expect(tones).toHaveLength(5)
  expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.4, 0)
  prefs.volume = 0
  window.dispatchEvent(new Event('test-volume'))
  audio.play('purchase')
  expect(tones).toHaveLength(5)
  expect(gains[0].gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0)
  prefs.volume = 40
  for (let i = 0; i < 100; i++) audio.play('purchase')
  expect(tones.length).toBeLessThanOrEqual(26)
  audio.dispose()
  expect(ctx.close).toHaveBeenCalled()
  expect(tones.every((n) => n.stop.mock.calls.length === 2)).toBe(true)
  window.dispatchEvent(new Event('pointerdown'))
  audio.play('purchase')
  expect(tones.length).toBeLessThanOrEqual(26)
})
it('does not allocate audio when effects are muted', () => {
  const Context = vi.fn()
  vi.stubGlobal('AudioContext', Context)
  prefs.sound = false
  const audio = createDefenseAudio()
  window.dispatchEvent(new Event('pointerdown'))
  audio.play('purchase')
  audio.dispose()
  expect(Context).not.toHaveBeenCalled()
})
