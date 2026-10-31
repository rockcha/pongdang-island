// All music sources announce playback before starting, including pending playback.
export const playbackEvent = 'pongdang:music-playback'
export function claimPlayback(source: 'library' | 'region' | 'exploration') {
  window.dispatchEvent(new CustomEvent(playbackEvent, {detail: source}))
}
