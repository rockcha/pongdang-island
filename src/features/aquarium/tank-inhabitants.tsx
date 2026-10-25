import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { OwnedCollectible } from '@/features/collection/api'
import type { TankRenderer } from './phaser-tank'
import type {TankWorldOptions} from './tank-world'
import {bindTankPinchZoom,type TankCamera} from './pinch-zoom'
import {hasOpenOverlay,subscribeOverlayActivity} from '@/components/overlay-back'
import {AquariumLoading} from './aquarium-loading'
import {TankLoadingContext,type TankAssetState} from './tank-loading-context'

export function TankInhabitants({ items,scenery,onPlace,onNavigate,onSelectDecoration,onBackgroundTap,onSelectionPosition,paused=false,world,viewRequest,preview=false,onWideView,fitView=false,pinchEnabled=true }: { items: OwnedCollectible[];scenery?:ReactNode;onPlace?:(id:string,x:number,y:number)=>void;onNavigate?:(direction:'previous'|'next')=>void;onSelectDecoration?:(id:string,x?:number,y?:number)=>void;onBackgroundTap?:()=>void;onSelectionPosition?:(id:string,x:number,y:number)=>void;paused?:boolean;world?:TankWorldOptions;viewRequest?:{position:number;zoom?:number;y?:number};preview?:boolean;onWideView?:()=>void;fitView?:boolean;pinchEnabled?:boolean }) {
  const columns=world?.columns??1
  const overview=world?.overview??false
  const camera=useRef<TankCamera>({zoom:overview?(world?.initialZoom??1/columns):1,view:world?.initialView??0,...(world?.fixedViewport?{y:0}:{})})
  const [zoom,setZoom]=useState(overview?(world?.initialZoom??1/columns):1)
  const preserveArrangement=world?.preserveArrangement??false
  const latestWorld=useRef(world)
  useEffect(()=>{latestWorld.current=world},[world])
  const root = useRef<HTMLDivElement>(null)
  const zoomViewport=useRef<HTMLDivElement>(null)
  const scene=useRef<HTMLDivElement>(null)
  const [rendererReady,setRendererReady]=useState(false),[backgroundState,setBackgroundState]=useState<TankAssetState>('ready'),[retry,setRetry]=useState(0)
  const [error,setError]=useState('')
  const assetSignature=items.map(item=>`${item.id}:${item.species.thumbnail_path}:${item.species.sprite_sheet_path??''}`).sort().join('|')
  const isReady=rendererReady&&backgroundState==='ready'&&!error
  const loadingError=error||(backgroundState==='failed'?'어항 배경을 불러오지 못했어요. 다시 준비해 주세요.':'')
  useEffect(()=>{if(overview&&pinchEnabled&&zoomViewport.current)return bindTankPinchZoom(zoomViewport.current,{columns,minZoom:world?.minZoom,maxZoom:world?.maxZoom,getState:()=>camera.current,onBegin:()=>renderer.current?.cancelGesture(),onEnd:()=>renderer.current?.cancelGesture(),onChange:value=>renderer.current?.setZoom(value.zoom,value.view,value.y)})},[columns,overview,pinchEnabled,world?.minZoom,world?.maxZoom])
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
  const updateVisibility=()=>{
    const visible=!pause.current&&onScreen.current&&!document.hidden&&!hasOpenOverlay()
    renderer.current?.setVisible(visible)
    if(scene.current)scene.current.dataset.motionPaused=String(!visible)
  }
  useEffect(()=>{pause.current=paused;updateVisibility()},[paused])
  useEffect(()=>{placement.current=onPlace},[onPlace])
  useLayoutEffect(()=>{setRendererReady(false);setError('')},[assetSignature,retry,columns,preserveArrangement])
  useEffect(()=>{
    if(isReady||loadingError)return
    const timer=setTimeout(()=>setError('어항 준비에 시간이 오래 걸리고 있어요. 연결을 확인하고 다시 준비해 주세요.'),25000)
    return()=>clearTimeout(timer)
  },[isReady,loadingError,assetSignature,retry])
  useEffect(()=>{if(viewRequest){if(viewRequest.zoom!==undefined)renderer.current?.setZoom(viewRequest.zoom,viewRequest.position,viewRequest.y);else renderer.current?.setView(viewRequest.position)}},[viewRequest,columns])
  useLayoutEffect(() => { if(items.some(item=>item.placement_locked)&&!latest.current.some(item=>item.placement_locked))renderer.current?.cancelGesture();latest.current = items; renderer.current?.setItems(items) }, [items])
  useEffect(() => {
    const parent = root.current
    if (!parent) return
    let active = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const visibility = updateVisibility
    const unsubscribeOverlay=subscribeOverlayActivity(visibility)
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
        renderer.current = createTankRenderer(parent, latest.current, reduced.matches, message => { if (active) setError(message) },(id,x,y)=>placement.current?.(id,x,y),direction=>navigation.current?.(direction),(id,x,y)=>selection.current?.(id,x,y),()=>backgroundTap.current?.(),(id,x,y)=>{
          const bounds=parent.getBoundingClientRect(),viewport=zoomViewport.current?.getBoundingClientRect()
          const scaleX=parent.clientWidth?bounds.width/parent.clientWidth:1,scaleY=parent.clientHeight?bounds.height/parent.clientHeight:1
          position.current?.(id,bounds.left-(viewport?.left??bounds.left)+x*scaleX,bounds.top-(viewport?.top??bounds.top)+y*scaleY)
        },columns>1?{...latestWorld.current,columns:3,preserveArrangement,onVerticalViewChange:value=>{camera.current.y=value;latestWorld.current?.onVerticalViewChange?.(value)},onZoomChange:value=>{camera.current.zoom=value;setZoom(value);latestWorld.current?.onZoomChange?.(value)},onViewChange:view=>{camera.current.view=view;latestWorld.current?.onViewChange?.(view)},canPan:()=>latestWorld.current?.canPan?.()??true}:undefined,value=>{if(active)setRendererReady(value)})
        visibility()
      } catch { setError('어항 화면을 시작하지 못했어요. 새로고침해주세요.') }
    }).catch(() => { if (active) setError('어항 화면을 불러오지 못했어요. 새로고침해주세요.') })
    return () => {
      active = false
      observer.disconnect(); intersection.disconnect()
      unsubscribeOverlay()
      density.removeEventListener('change',densityChanged)
      window.removeEventListener('resize',resize)
      document.removeEventListener('visibilitychange', visibility)
      reduced.removeEventListener('change', preference)
      renderer.current?.destroy(); renderer.current = null
    }
  }, [columns,preserveArrangement,retry,overview])
  return <div ref={zoomViewport} className="absolute inset-0 touch-none cursor-pointer overflow-hidden" aria-busy={!isReady} data-tank-ready={isReady} aria-label={`어항 속 개체 ${items.length}개`}>
    <div ref={scene} data-tank-zoom-scene aria-hidden={!isReady} className={`absolute inset-0 ${isReady?'aquarium-scene-enter':''}`} style={{visibility:isReady?'visible':'hidden',pointerEvents:isReady?undefined:'none'}}>
      <TankLoadingContext.Provider value={setBackgroundState}><Fragment key={retry}>{scenery}</Fragment></TankLoadingContext.Provider>
      <div ref={root} className="absolute inset-0" aria-hidden="true"/>
    </div>
    {overview&&!preview&&(!fitView||onWideView)&&isReady&&<button type="button" aria-label={onWideView?"전체보기(가로 화면)":undefined} className="absolute right-2 top-2 z-10 min-h-9 rounded-full border border-white/40 bg-background/65 px-3 text-[11px] text-primary backdrop-blur-sm" data-wide-trigger={onWideView?true:undefined} onClick={()=>onWideView?onWideView():renderer.current?.setZoom(zoom>1/columns+.001?1/columns:1,zoom>1/columns+.001?0:1)}><span className="aquarium-label-full">{onWideView?'전체보기(가로 화면)':zoom>1/columns+.001?'전체 보기':'확대'}</span><span className="aquarium-label-short">{onWideView?'가로 화면':zoom>1/columns+.001?'전체':'확대'}</span></button>}
    {fitView&&isReady&&<button data-tank-fit type="button" aria-label={zoom>(world?.minZoom??1)+.001?'어항 화면 맞춤':'어항 확대'} className="absolute bottom-2 left-2 z-10 min-h-9 rounded-full border border-white/40 bg-background/75 px-3 text-[11px] text-primary shadow-sm backdrop-blur-sm" onClick={()=>{
      const minimum=world?.minZoom??1
      if(zoom>minimum+.001){renderer.current?.setZoom(minimum,1,0);return}
      const next=Math.min(world?.maxZoom??2,minimum*1.5),state=camera.current
      const ratio=zoomViewport.current?zoomViewport.current.clientHeight/Math.max(1,zoomViewport.current.clientWidth):1.6
      renderer.current?.setZoom(next,state.view+1/(2*state.zoom)-1/(2*next),(state.y??0)+ratio/(2*state.zoom)-ratio/(2*next))
    }}>{zoom>(world?.minZoom??1)+.001?'화면 맞춤':'확대'}</button>}
    {isReady&&<ul className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-x-2 focus-within:top-16 focus-within:z-20 focus-within:rounded focus-within:bg-background focus-within:p-3">{items.map(item => <li key={item.id}>{onSelectDecoration?<button onClick={()=>{if(renderer.current?.selectItem)renderer.current.selectItem(item.id);else onSelectDecoration(item.id)}}>{item.species.name} 선택</button>:item.species.name}</li>)}</ul>}
    {!isReady&&<AquariumLoading error={loadingError} onRetry={()=>{setRendererReady(false);setError('');setBackgroundState('ready');setRetry(value=>value+1)}}/>}
  </div>
}
