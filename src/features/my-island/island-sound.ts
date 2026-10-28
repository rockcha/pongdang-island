import { audioVolume } from '@/features/audio/audio-preferences'
import { readFishingSound } from '@/features/fishing/sound-preference'
let context: AudioContext | undefined,
  last = 0
export function playIslandPlacement() {
  if (
    typeof window === 'undefined' ||
    document.hidden ||
    !readFishingSound() ||
    audioVolume('effects') === 0 ||
    performance.now() - last < 100
  )
    return
  const Engine =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Engine) return
  try {
    last = performance.now()
    context ??= new Engine({ latencyHint: 'interactive' })
    void context.resume().catch(() => {})
    const now = context.currentTime,
      oscillator = context.createOscillator(),
      gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(740, now)
    oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.085)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime((0.045 * audioVolume('effects')) / 100, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.12)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  } catch {
    /* Placement succeeds even when browser audio is unavailable. */
  }
}
