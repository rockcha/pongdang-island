import { audioVolume, audioVolumeChanged } from '@/features/audio/audio-preferences'
import { readFishingSound, fishingSoundChanged } from '@/features/fishing/sound-preference'

export function createBilliardsAudio() {
  let context: AudioContext | undefined,
    master: GainNode | undefined,
    disposed = false
  const sources = new Set<OscillatorNode>()
  const volume = () => {
    if (context && master)
      master.gain.setValueAtTime(
        readFishingSound() && !document.hidden ? audioVolume('effects') / 100 : 0,
        context.currentTime,
      )
  }
  window.addEventListener(audioVolumeChanged, volume)
  window.addEventListener(fishingSoundChanged, volume)
  document.addEventListener('visibilitychange', volume)
  return {
    unlock() {
      if (disposed) return
      try {
        context ??= new AudioContext()
        if (!master) {
          master = context.createGain()
          master.connect(context.destination)
        }
        volume()
        if (context.state === 'suspended') void context.resume().catch(() => {})
      } catch {
        /* Audio is optional and must never interrupt a shot. */
      }
    },
    play(kind: 'red' | 'yellow') {
      if (
        disposed ||
        !context ||
        !master ||
        context.state !== 'running' ||
        document.hidden ||
        !readFishingSound()
      )
        return
      try {
        volume()
        const at = context.currentTime,
          osc = context.createOscillator(),
          gain = context.createGain()
        const duration = kind === 'red' ? 0.12 : 0.19
        osc.type = kind === 'red' ? 'sine' : 'triangle'
        osc.frequency.setValueAtTime(kind === 'red' ? 840 : 240, at)
        osc.frequency.exponentialRampToValueAtTime(kind === 'red' ? 560 : 110, at + duration)
        gain.gain.setValueAtTime(0.001, at)
        gain.gain.exponentialRampToValueAtTime(0.16, at + 0.006)
        gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
        osc.connect(gain)
        gain.connect(master)
        sources.add(osc)
        osc.onended = () => {
          sources.delete(osc)
          osc.disconnect()
          gain.disconnect()
        }
        osc.start(at)
        osc.stop(at + duration + 0.01)
      } catch {
        /* Keep visual feedback available if audio is unavailable. */
      }
    },
    dispose() {
      disposed = true
      window.removeEventListener(audioVolumeChanged, volume)
      window.removeEventListener(fishingSoundChanged, volume)
      document.removeEventListener('visibilitychange', volume)
      for (const source of sources) {
        try {
          source.stop()
        } catch {}
      }
      sources.clear()
      if (context) void context.close().catch(() => {})
    },
  }
}
