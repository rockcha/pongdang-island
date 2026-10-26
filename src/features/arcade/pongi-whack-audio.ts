import { audioVolume, audioVolumeChanged } from '@/features/audio/audio-preferences'
import { readFishingSound, fishingSoundChanged } from '@/features/fishing/sound-preference'
import type { WhackTarget } from './pongi-whack-model'

/** Short synthesized hits share the game's effects preference; no downloaded sound assets. */
export function createWhackAudio() {
  let context: AudioContext | undefined,
    master: GainNode | undefined,
    disposed = false
  const sources = new Set<AudioScheduledSourceNode>()
  const volume = () => {
    if (context && master)
      master.gain.setValueAtTime(
        readFishingSound() && !document.hidden ? audioVolume('effects') / 100 : 0,
        context.currentTime,
      )
  }
  const stop = () => {
    for (const source of sources) {
      try {
        source.stop()
      } catch {}
      source.disconnect()
    }
    sources.clear()
  }
  const visibility = () => {
    if (document.hidden) stop()
    volume()
  }
  window.addEventListener(audioVolumeChanged, volume)
  window.addEventListener(fishingSoundChanged, volume)
  document.addEventListener('visibilitychange', visibility)
  function attach(source: AudioScheduledSourceNode, node: AudioNode) {
    source.connect(node)
    sources.add(source)
    source.onended = () => {
      sources.delete(source)
      source.disconnect()
      node.disconnect()
    }
  }
  function tone(
    frequency: number,
    end: number,
    duration: number,
    delay = 0,
    type: OscillatorType = 'sine',
    level = 0.2,
  ) {
    const ctx = context!,
      at = ctx.currentTime + delay,
      osc = ctx.createOscillator(),
      gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, at)
    osc.frequency.exponentialRampToValueAtTime(end, at + duration)
    gain.gain.setValueAtTime(0.001, at)
    gain.gain.exponentialRampToValueAtTime(level, at + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
    gain.connect(master!)
    attach(osc, gain)
    osc.start(at)
    osc.stop(at + duration + 0.01)
  }
  function noise(duration: number, frequency: number, level: number) {
    const ctx = context!,
      buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate),
      data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain()
    source.buffer = buffer
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    gain.gain.value = level
    source.connect(filter)
    filter.connect(gain)
    gain.connect(master!)
    sources.add(source)
    source.onended = () => {
      sources.delete(source)
      source.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
    source.start()
    source.stop(ctx.currentTime + duration)
  }
  return {
    play(kind: WhackTarget['kind']) {
      if (disposed || document.hidden || !readFishingSound() || audioVolume('effects') === 0) return
      try {
        context ??= new AudioContext()
        if (!master) {
          master = context.createGain()
          master.connect(context.destination)
        }
        volume()
        if (context.state === 'suspended') void context.resume().catch(() => {})
        if (kind === 'pongi') tone(560, 180, 0.11)
        else if (kind === 'golden') {
          tone(880, 1100, 0.13)
          tone(1320, 1650, 0.18, 0.07)
          tone(1760, 2090, 0.22, 0.14, 'sine', 0.12)
        } else if (kind === 'bomb') {
          tone(140, 35, 0.25, 0, 'triangle', 0.24)
          noise(0.24, 650, 0.35)
        } else if (kind === 'hay' || kind === 'sandcastle') {
          noise(0.17, 3000, 0.2)
          tone(210, 110, 0.1, 0, 'triangle', 0.1)
        } else {
          tone(240, 140, 0.13, 0, 'triangle')
          tone(170, 100, 0.12, 0.07, 'triangle', 0.1)
        }
      } catch {
        /* Sound never blocks input or score. */
      }
    },
    dispose() {
      disposed = true
      stop()
      window.removeEventListener(audioVolumeChanged, volume)
      window.removeEventListener(fishingSoundChanged, volume)
      document.removeEventListener('visibilitychange', visibility)
      if (context) void context.close().catch(() => {})
    },
  }
}
