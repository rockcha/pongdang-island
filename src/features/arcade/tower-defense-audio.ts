import { audioVolume, audioVolumeChanged } from '@/features/audio/audio-preferences'
import { readFishingSound, fishingSoundChanged } from '@/features/fishing/sound-preference'

export function createDefenseAudio() {
  let context: AudioContext | undefined,
    master: GainNode | undefined,
    disposed = false
  const sources = new Set<OscillatorNode>()
  let lastBreach = -Infinity
  const volume = () => {
    if (context && master)
      master.gain.setValueAtTime(
        !document.hidden && readFishingSound() ? audioVolume('effects') / 100 : 0,
        context.currentTime,
      )
  }
  const unlock = () => {
    if (disposed || !readFishingSound() || !audioVolume('effects')) return
    try {
      context ??= new AudioContext()
      if (!master) {
        master = context.createGain()
        master.connect(context.destination)
      }
      volume()
      if (context.state === 'suspended') void context.resume().catch(() => {})
    } catch {
      /* Audio must never block a purchase. */
    }
  }
  const stop = () => {
    for (const source of sources) {
      try {
        source.stop()
      } catch {}
    }
  }
  const visibility = () => {
    if (document.hidden) stop()
    volume()
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
  window.addEventListener(audioVolumeChanged, volume)
  window.addEventListener(fishingSoundChanged, volume)
  document.addEventListener('visibilitychange', visibility)
  function tone(
    frequency: number,
    end: number,
    duration: number,
    delay = 0,
    type: OscillatorType = 'sine',
    level = 0.13,
  ) {
    const ctx = context!,
      at = ctx.currentTime + delay,
      source = ctx.createOscillator(),
      gain = ctx.createGain()
    source.type = type
    source.frequency.setValueAtTime(frequency, at)
    source.frequency.exponentialRampToValueAtTime(end, at + duration)
    gain.gain.setValueAtTime(0.001, at)
    gain.gain.exponentialRampToValueAtTime(level, at + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
    source.connect(gain)
    gain.connect(master!)
    sources.add(source)
    source.onended = () => {
      sources.delete(source)
      source.disconnect()
      gain.disconnect()
    }
    source.start(at)
    source.stop(at + duration + 0.01)
  }
  return {
    play(kind: 'purchase' | 'breach' | 'beam' | 'blast') {
      if (disposed || document.hidden || !readFishingSound() || !audioVolume('effects')) return
      unlock()
      if (!context || context.state !== 'running') return
      if (sources.size >= 24) return
      if (kind === 'breach') {
        if (context.currentTime - lastBreach < 0.12) return
        lastBreach = context.currentTime
      }
      try {
        if (kind === 'purchase') {
          tone(160, 70, 0.12, 0, 'triangle', 0.16)
          tone(660, 880, 0.13, 0.02)
          tone(990, 1320, 0.18, 0.1, 'sine', 0.1)
        } else if (kind === 'beam') {
          tone(1200, 180, 0.2, 0, 'sine', 0.09)
          tone(600, 110, 0.18, 0.015, 'triangle', 0.06)
        } else if (kind === 'blast') {
          tone(150, 45, 0.2, 0, 'triangle', 0.13)
        } else {
          tone(110, 45, 0.22, 0, 'triangle', 0.2)
          tone(180, 70, 0.16, 0.02, 'sine', 0.13)
        }
      } catch {
        /* Rendering and simulation continue if sound is unavailable. */
      }
    },
    dispose() {
      disposed = true
      stop()
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      window.removeEventListener(audioVolumeChanged, volume)
      window.removeEventListener(fishingSoundChanged, volume)
      document.removeEventListener('visibilitychange', visibility)
      if (context) void context.close().catch(() => {})
    },
  }
}
