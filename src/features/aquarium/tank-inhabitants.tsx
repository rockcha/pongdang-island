import { useEffect, useRef, useState } from 'react'
import type { OwnedCollectible } from '@/features/collection/api'
import type { TankRenderer } from './phaser-tank'

export function TankInhabitants({ items,onPlace,onNavigate,onSelectDecoration,onBackgroundTap,onSelectionPosition,paused=false }: { items: OwnedCollectible[];onPlace?:(id:string,x:number,y:number)=>void;onNavigate?:(direction:'previous'|'next')=>void;onSelectDecoration?:(id:string,x?:number,y?:number)=>void;onBackgroundTap?:()=>void;onSelectionPosition?:(id:string,x:number,y:number)=>void;paused?:boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const renderer = useRef<TankRenderer | null>(null)
  const latest = useRef(items)
  const placement=useRef(onPlace)
  const navigation=useRef(onNavigate)
  const selection=useRef(onSelectDecoration)
  const position=useRef(onSelectionPosition)
  position.current=onSelectionPosition
  const backgroundTap=useRef(onBackgroundTap)
  useEffect(()=>{backgroundTap.current=onBackgroundTap},[onBackgroundTap])
  useEffect(()=>{selection.current=onSelectDecoration},[onSelectDecoration])
  useEffect(()=>{navigation.current=onNavigate},[onNavigate])
  const pause=useRef(paused)
  const onScreen=useRef(true)
  useEffect(()=>{pause.current=paused;renderer.current?.setVisible(!paused&&onScreen.current&&!document.hidden)},[paused])
  useEffect(()=>{placement.current=onPlace},[onPlace])
  const [error, setError] = useState('')
  useEffect(() => { latest.current = items; renderer.current?.setItems(items) }, [items])
  useEffect(() => {
    const parent = root.current
    if (!parent) return
    let active = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const visibility = () => renderer.current?.setVisible(!pause.current&&onScreen.current && !document.hidden)
    const preference = () => renderer.current?.setReduced(reduced.matches)
    const resize=()=>renderer.current?.resize(parent.clientWidth,parent.clientHeight)
    let density=window.matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`)
    const densityChanged=()=>{density.removeEventListener('change',densityChanged);resize();density=window.matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`);density.addEventListener('change',densityChanged)}
    density.addEventListener('change',densityChanged)
    window.addEventListener('resize',resize)
    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    const intersection = new IntersectionObserver(entries => { onScreen.current = entries[0]?.isIntersecting ?? true; visibility() })
    intersection.observe(parent)
    document.addEventListener('visibilitychange', visibility)
    reduced.addEventListener('change', preference)
    void import('./phaser-tank').then(({ createTankRenderer }) => {
      if (!active) return
      try {
        renderer.current = createTankRenderer(parent, latest.current, reduced.matches, message => { if (active) setError(message) },(id,x,y)=>placement.current?.(id,x,y),direction=>navigation.current?.(direction),(id,x,y)=>selection.current?.(id,x,y),()=>backgroundTap.current?.(),(id,x,y)=>position.current?.(id,x,y))
        visibility()
      } catch { setError('어항 화면을 시작하지 못했어요. 새로고침해주세요.') }
    }).catch(() => { if (active) setError('어항 화면을 불러오지 못했어요. 새로고침해주세요.') })
    return () => {
      active = false
      observer.disconnect(); intersection.disconnect()
      density.removeEventListener('change',densityChanged)
      window.removeEventListener('resize',resize)
      document.removeEventListener('visibilitychange', visibility)
      reduced.removeEventListener('change', preference)
      renderer.current?.destroy(); renderer.current = null
    }
  }, [])
  return <div className="absolute inset-0 cursor-pointer overflow-hidden" aria-label={`어항 속 개체 ${items.length}개`}>
    <div ref={root} className="absolute inset-0" aria-hidden="true"/>
    <ul className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-x-2 focus-within:top-16 focus-within:z-20 focus-within:rounded focus-within:bg-background focus-within:p-3">{items.map(item => <li key={item.id}>{onSelectDecoration?<button onClick={()=>onSelectDecoration(item.id)}>{item.species.name} 선택</button>:item.species.name}</li>)}</ul>
    {error && <p role="alert" className="pointer-events-none absolute inset-x-2 top-2 rounded bg-background/90 p-2 text-xs text-destructive">{error}</p>}
  </div>
}
