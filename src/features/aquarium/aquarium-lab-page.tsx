import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Fish, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTankRenderer } from './phaser-tank'
import type { TankRenderer } from './phaser-tank'
import type { TankWorldFrame } from './tank-world'
import type { OwnedCollectible, Species } from '@/features/collection/api'
import catalog from '../../../supabase/catalog/catalog.json'
import { themePanoramaUrl } from './theme-panorama'

const themes = catalog.aquarium_backgrounds
const sampleIds = ['plump-horse-mackerel', 'pongul', 'round-filefish', 'sand-goby', 'silver-anchovy', 'striped-mackerel', 'coral-seabream', 'mint-mahi-mahi']
const labels = ['왼쪽', '가운데', '오른쪽']
function localArtwork(path: string) {
  return new URL(`/assets/storage-upload/collectibles/${path}`, window.location.origin).href
}
function sampleInhabitants(): OwnedCollectible[] {
  return Array.from({ length: 24 }, (_, index) => {
    const species = catalog.collectible_species.find(species => species.id === sampleIds[index % sampleIds.length])! as unknown as Species
    return {
      id: `panorama-sample-${index}`, species_id: species.id, tank_id: 'local-panorama',
      animation_seed: (index * 7919 + 314159) % 1000000,
      position_x: null, position_y: null, acquired_at: '',
      species,
    }
  })
}

export default function AquariumLabPage() {
  const [themeId, setThemeId] = useState(() => new URLSearchParams(window.location.search).get('theme') ?? 'default')
  const theme = themes.find(theme => theme.id === themeId) ?? themes.find(theme => theme.id === 'default')!
  const panorama = themePanoramaUrl(theme.image_path)
  const canvas = useRef<HTMLDivElement>(null)
  const renderer = useRef<TankRenderer | null>(null)
  const position = useRef(1)
  const [view, setView] = useState(1)
  const [frame, setFrame] = useState<TankWorldFrame | null>(null)
  const [items] = useState(sampleInhabitants)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(false)
  const pause = useRef(false)
  const [ready, setReady] = useState(false)
  const [backgroundError, setBackgroundError] = useState(false)
  useEffect(() => { setBackgroundError(false) }, [themeId])
  useEffect(() => {
    const parent = canvas.current
    if (!parent) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const tank = createTankRenderer(parent, items, reduced.matches, setError, undefined, undefined, id => setSelected(id), () => setSelected(null), undefined, {
      columns: 3, initialView: 1,
      assetUrl: localArtwork,
      motionPaused: () => pause.current,
      onViewChange: value => { position.current = value; setView(value) },
      onFrame: value => { setFrame(value); if (value.inhabitants.length === items.length) setReady(true) },
    })
    renderer.current = tank
    const resize = () => tank.resize(parent.clientWidth, parent.clientHeight)
    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    const preference = () => tank.setReduced(reduced.matches)
    const visibility = () => tank.setVisible(!document.hidden)
    reduced.addEventListener('change', preference)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      observer.disconnect(); reduced.removeEventListener('change', preference)
      document.removeEventListener('visibilitychange', visibility)
      renderer.current = null; tank.destroy()
    }
  }, [items])
  useEffect(() => { pause.current = paused }, [paused])
  const selectedItem = items.find(item => item.id === selected)
  const current = Math.round(view)
  function go(next: number) { renderer.current?.setView(next) }
  return <main className="mx-auto flex h-dvh min-h-0 max-w-[440px] flex-col overflow-hidden bg-background text-foreground shadow-sm">
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
      <div className="min-w-0 flex-1"><label className="sr-only" htmlFor="aquarium-theme">어항 테마</label><select id="aquarium-theme" className="min-h-11 w-full rounded-lg border bg-background px-2 text-sm" value={theme.id} onChange={event => {setThemeId(event.target.value); const url=new URL(window.location.href); url.searchParams.set('theme',event.target.value); window.history.replaceState(null,'',url)}}>{themes.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select><p className="mt-0.5 text-[11px] text-muted-foreground">하나로 이어진 넓은 어항 · {themes.length}개 테마</p></div>
      <a href="/artifacts/previews/aquarium-theme-gallery.html" className="shrink-0 rounded-full border px-2 py-2 text-[10px] text-muted-foreground">전체 풍경</a>
    </header>
    <section tabIndex={0} aria-label={`세 칸으로 이어진 ${theme.name} 어항`} data-testid="panorama-glass" data-view={view.toFixed(4)} data-world-width={frame?.width} data-viewport-width={frame?.viewportWidth} data-clock={frame?.clock} data-ready={ready} className="relative min-h-0 flex-1 overflow-hidden bg-cyan-500 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" onKeyDown={event => {
      if (event.target !== event.currentTarget) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); go(Math.round(position.current) + (event.key === 'ArrowLeft' ? -1 : 1)) }
    }}>
      <div data-testid="panorama-background" className="pointer-events-none absolute inset-y-0 left-0 w-[300%]" style={{ transform: `translateX(${-view * 100 / 3}%)` }}>
        <img key={themeId} src={panorama} alt={`좌우로 이어지는 ${theme.name}`} draggable={false} className="size-full object-cover" onError={() => setBackgroundError(true)}/>
      </div>
      <div ref={canvas} className="absolute inset-0 touch-none"/>
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center"><span className="rounded-full bg-background/85 px-3 py-1 text-[11px] text-primary shadow-sm">{labels[current]} · {current + 1}/3</span></div>
      {(!ready || error || backgroundError) && <p role="status" className="pointer-events-none absolute inset-x-4 top-12 rounded-xl bg-background/90 p-3 text-center text-xs">{backgroundError ? '파노라마 배경을 불러오지 못했어요.' : error || '넓은 어항을 준비하고 있어요…'}</p>}
      {selectedItem && <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl border bg-background/95 px-3 py-1.5 shadow-sm"><Fish className="size-4 text-primary"/><span className="min-w-0 flex-1 truncate text-xs">{selectedItem.species.name}</span><Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="물고기 선택 닫기" onClick={() => setSelected(null)}><X className="size-4"/></Button></div>}
    </section>
    <footer className="shrink-0 space-y-2 border-t px-3 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
      <div role="group" aria-label="어항 둘러보기" className="relative h-12 overflow-hidden rounded-xl bg-cyan-950/85">
        <div className="pointer-events-none absolute inset-y-0 w-1/3 rounded-lg border-2 border-primary/80 bg-white/15" style={{ left: `${view * 100 / 3}%` }}/>
        {frame?.inhabitants.map(item => <span key={item.id} data-fish-id={item.id} data-world-x={item.x.toFixed(3)} className={`pointer-events-none absolute size-1.5 rounded-full ${item.id === selected ? 'bg-amber-300' : 'bg-cyan-100/70'}`} style={{ left: `${(item.x + item.size / 2) / frame.width * 100}%`, top: `${(item.y + item.size / 2) / frame.height * 100}%` }}/>) }
        <div className="absolute inset-0 grid grid-cols-3 divide-x divide-white/15">{labels.map((label, index) => <button key={label} type="button" aria-label={`${label} 보기`} aria-pressed={current === index} className="relative flex min-h-11 items-center justify-center gap-1 text-[11px] text-white [text-shadow:0_1px_3px_#000] focus-visible:outline-2 focus-visible:outline-white" onClick={() => go(index)}>{index === 0 && <ChevronLeft className="size-3.5"/>}{label}{index === 2 && <ChevronRight className="size-3.5"/>}</button>)}</div>
      </div>
      <div className="flex items-center justify-between gap-2"><p className="text-[10px] text-muted-foreground">빈 곳을 좌우로 밀어 둘러보세요.</p><Button variant="ghost" size="sm" className="min-h-9 px-2 text-[10px]" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? '다시 헤엄치기' : '잠깐 멈추기'}</Button></div>
    </footer>
  </main>
}
