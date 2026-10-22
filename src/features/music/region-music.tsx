import {useCallback, useEffect, useRef, useState} from 'react'
import {ChevronDown, Music2, Volume2, VolumeX} from 'lucide-react'
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
  const [enabled, setEnabled] = useState(savedEnabled)
  const [volume, setVolume] = useState(savedVolume)
  const [expanded, setExpanded] = useState(false)
  const [state, setState] = useState<'paused' | 'loading' | 'playing' | 'blocked' | 'error'>('paused')
  const audio = useRef<HTMLAudioElement | null>(null)
  const generation = useRef(0)
  const initialEnabled = useRef(enabled)
  const volumeRef = useRef(volume)
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
      setEnabled(false)
      save(enabledKey, 'false')
      pause()
    } else {
      setEnabled(true)
      save(enabledKey, 'true')
      start()
    }
  }
  const playing = state === 'playing'
  return <div className="absolute top-2 left-2 z-30 max-w-[calc(100%-1rem)] text-[#725039]">
    <div className="flex min-h-11 items-center rounded-full border border-white/70 bg-[#fff8eb]/90 shadow-sm backdrop-blur-md">
      <button type="button" onClick={toggle} aria-label={playing || state === 'loading' ? '배경음악 끄기' : '배경음악 켜기'} aria-pressed={playing} className="flex min-h-10 items-center gap-2 rounded-full px-3 text-xs">
        {playing ? <Music2 className="size-4"/> : <VolumeX className="size-4"/>}
        <span>{state === 'loading' ? '음악 불러오는 중' : state === 'blocked' ? '눌러서 음악 시작' : state === 'error' ? '음악 다시 재생' : playing ? track.label : '배경음악 꺼짐'}</span>
      </button>
      <button type="button" aria-label="배경음악 볼륨 조절" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="flex size-10 items-center justify-center rounded-full border-l border-[#725039]/10"><ChevronDown className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}/></button>
    </div>
    {expanded && <div className="mt-2 w-60 rounded-2xl border border-white/70 bg-[#fff8eb]/95 p-3 shadow-sm backdrop-blur-md">
      <p className="text-xs">{track.title}</p>
      <p className="mt-1 text-[10px] opacity-65">{track.artist}</p>
      <label className="mt-3 flex items-center gap-2 text-xs"><Volume2 className="size-4"/><span className="sr-only">배경음악 볼륨</span><input type="range" min="0" max="100" value={volume} onChange={event => {
        const next = Number(event.target.value)
        volumeRef.current = next
        setVolume(next)
        save(volumeKey, String(next))
        if (audio.current) audio.current.volume = next / 100
      }} className="min-w-0 flex-1 accent-[#ad8056]"/><span className="w-8 text-right tabular-nums">{volume}%</span></label>
      {!enabled && <p className="mt-2 text-[10px] opacity-65">음악을 켜면 이 볼륨으로 재생해요.</p>}
    </div>}
  </div>
}
