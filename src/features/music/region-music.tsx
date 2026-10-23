import {useCallback, useEffect, useRef, useState} from 'react'
import {Music2,VolumeX} from 'lucide-react'
import {claimPlayback, playbackEvent} from './playback-ownership'

const enabledKey = 'pongdang:region-music-enabled'
const volumeKey = 'pongdang:region-music-volume'
function savedEnabled() {
  try { return localStorage.getItem(enabledKey) !== 'false' } catch { return true }
}
function savedVolume() {
  try {
    const value = localStorage.getItem(volumeKey)
    const volume = value === null ? 30 : Number(value)
    return Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : 30
  } catch { return 30 }
}
function save(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* Playback also works without storage. */ }
}
const tracks: Record<string, {src: string; label: string; title: string; artist: string}> = {
  pongdang: {src: '/music/pongdang-journey.mp3', label: '퐁당섬의 선율', title: 'A Regular Day on the Journey', artist: 'Tales of Velmora'},
  coral: {src: '/music/coral.mp3', label: '산호 바다의 선율', title: '모험', artist: '찬사'},
  mistmoon: {src: '/music/mistmoon.mp3', label: '안개달의 선율', title: '안개달 배경음악', artist: '찬사'},
  whitenight: {src: '/music/whitenight.mp3', label: '빙해의 선율', title: '얼음성', artist: '브금브금 BGMBGM'},
  cloudferry: {src: '/music/cloudferry.mp3', label: '구름나루의 선율', title: '따뜻한 지브리 OST 모음', artist: 'Natural'},
  siren: {src: '/music/siren.mp3', label: '세이렌의 선율', title: 'Down Below', artist: '산지직쏭'},
  bluegrove: {src: '/music/bluegrove.mp3', label: '푸른골의 선율', title: '이 노래에 그리움이 느껴진다면, 너도 바다의 아이였을 거야', artist: '냥법사의 심심테스트'},
  mukhyang: {src: '/music/mukhyang.mp3', label: '묵향의 선율', title: '아련한 동양풍 음악 모음', artist: 'Tido Kang'},
  starruins: {src: '/music/starruins.mp3', label: '별잠 유적의 선율', title: 'The Fields of Ard Skellig', artist: 'The Witcher 3: Wild Hunt OST'},
  primal: {src: '/music/primal.mp3', label: '원시섬의 선율', title: 'Jurassic Park · Soft Piano Version', artist: 'Piano Pill'},
}
export function RegionMusic({regionId}: {regionId: string}) {
  const track = tracks[regionId]
  return track ? <MapMusic key={regionId} track={track}/> : null
}
function MapMusic({track}: {track: (typeof tracks)[string]}) {
  const [state, setState] = useState<'paused' | 'loading' | 'playing' | 'blocked' | 'error'>('paused')
  const audio = useRef<HTMLAudioElement | null>(null)
  const generation = useRef(0)
  const initialEnabled = useRef(savedEnabled())
  // A previously muted volume must still be audible now that only on/off is exposed.
  const volumeRef = useRef(savedVolume() || 30)
  const pause = useCallback(() => {
    generation.current++
    audio.current?.pause()
    setState('paused')
  }, [])
  const start = useCallback(() => {
    const player = audio.current
    if (!player) return
    claimPlayback('region')
    const attempt = ++generation.current
    setState('loading')
    void player.play().then(() => {
      if (generation.current === attempt) setState('playing')
    }).catch((error: unknown) => {
      if (generation.current !== attempt) return
      setState(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'error')
    })
  }, [])
  useEffect(() => {
    const player = new Audio(track.src)
    player.loop = true
    player.preload = 'none'
    player.volume = volumeRef.current / 100
    audio.current = player
    const onError = () => setState('error')
    const onOwnership = (event: Event) => {
      if ((event as CustomEvent).detail !== 'region') pause()
    }
    player.addEventListener('error', onError)
    window.addEventListener(playbackEvent, onOwnership)
    if (initialEnabled.current) start()
    return () => {
      generation.current++
      player.removeEventListener('error', onError)
      window.removeEventListener(playbackEvent, onOwnership)
      player.pause()
      player.removeAttribute('src')
      player.load()
      audio.current = null
    }
  }, [pause, start, track.src])
  function toggle() {
    if (state === 'playing' || state === 'loading') {
      save(enabledKey, 'false')
      pause()
    } else {
      save(enabledKey, 'true')
      start()
    }
  }
  const on=state==='playing'||state==='loading'
  const status=state==='loading'?'음악 불러오는 중':state==='blocked'?'눌러서 음악 시작':state==='error'?'음악 다시 재생':state==='playing'?track.label:'배경음악 꺼짐'
  return <>
    <button type="button" onClick={toggle} aria-label={on?'배경음악 끄기':'배경음악 켜기'} aria-pressed={on} aria-busy={state==='loading'} title={`${status} · ${track.title} · ${track.artist}`} className={`flex size-9 shrink-0 items-center justify-center rounded-full border border-white/70 bg-[#fff8eb]/90 text-[#725039] shadow-sm backdrop-blur-md transition-colors hover:bg-[#fff8eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 `}>
      {on?<Music2 aria-hidden="true" className="size-3.5"/>:<VolumeX aria-hidden="true" className="size-3.5"/>}
    </button>
    <span role="status" className="sr-only">{status}</span>
  </>
}
