import {Menu as ActionMenu} from '@base-ui/react/menu'
import { useEffect, useLayoutEffect,useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {createPortal} from 'react-dom'
import { ChevronUp,Minimize2,Smartphone,Minus,Plus,SlidersHorizontal,Check,Ellipsis,Maximize2,ZoomIn } from 'lucide-react'
import {useAquariumWideMode} from './use-aquarium-wide-mode'
import { Button } from '@/components/ui/button'
import type { DecorationPlacement, OwnedCollectible } from '@/features/collection/api'
import { AquariumBackdrop } from './aquarium-backdrop'
import {AquariumAmbience} from './aquarium-ambience'
import { TankInhabitants } from './tank-inhabitants'
import { TankBubbles } from './tank-bubbles'
import { AquariumInventoryDialog } from './aquarium-inventory-dialog'
import { canArrangeSpecies } from './movement-settings'
import { DecorationEditor } from './decoration-editor'
import { FishSizeEditor } from './fish-size-editor'
import { decorationGeometry } from './decoration-geometry'
import { FriendAquariumPicker } from '@/features/friends/friend-aquarium-picker'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CollectibleActions } from './collectible-actions'
import type { AquariumTank } from './api'
import { InhabitantLayerEditor } from './inhabitant-layer-editor'
import { automaticInhabitantDepth } from './inhabitant-depth'
import { themePanoramaUrl } from './theme-panorama'
import { clampTankCameraView, tankWorldItem,panoramaTankHeight,aquariumLayoutWidth } from './tank-world'
import { SelectionToolbar } from './selection-toolbar'
import type { SelectionPanel } from './selection-toolbar'
import './aquarium-wide.css'
import {useFittedTankViewport} from './use-fitted-tank-viewport'
import {wideTankFrame} from './wide-tank-frame'
import {hasOpenOverlay} from '@/components/overlay-back'

type Props = {
  onRename?:()=>void
  autoWide?:boolean
  onWideExit?:()=>void
  overviewContent?:ReactNode
  onOverview?:()=>void
  loading?: boolean
  items: OwnedCollectible[]
  name: string
  tankId?: string
  background?: { name: string; image_path: string }
  selectorControls?: ReactNode
  capacityControls?: ReactNode
  nameControls?: ReactNode
  operatorControls?: ReactNode
  backgroundControls?: ReactNode
  managementControls?: ReactNode
  storageControls?: ReactNode
  bottomControls?: ReactNode
  purchase?: { price: number; disabled: boolean; onBuy: () => void }
  busy: boolean
  onPlace: (id: string, x: number, y: number) => void
  onArrange?: (id: string, value: DecorationPlacement) => Promise<void>
  onSell: (ids: string[]) => Promise<void>
  onGiftSent?: (ids: string[]) => void
  onStore?: (ids: string[]) => Promise<void>
  onMove?: (ids: string[], tankId: string | null) => Promise<void>
  tanks?: AquariumTank[]
  inhabitants?: OwnedCollectible[]
  tankCapacity?: number
  onLayerChange?: (id: string, layer: number | null) => Promise<void>
  navigation?: { index: number; count: number; onChange: (direction: 'previous' | 'next') => void }
}
export function AquariumView(props: Props) {
  const wide=useAquariumWideMode(props.onWideExit)
  const autoOpened=useRef(false)
  useLayoutEffect(()=>{
    if(!props.autoWide){if(autoOpened.current){autoOpened.current=false;wide.exit()}return}
    if(!autoOpened.current){autoOpened.current=true;wide.enter()}
  },[props.autoWide])
  const [wideCamera,setWideCamera]=useState(false)
  const [wideFill,setWideFill]=useState(true)
  const wideCameraTrigger=useRef<HTMLButtonElement>(null)
  const mobileHeadingTrigger=useRef<HTMLButtonElement>(null)
  const operatorAction=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    if(!wide.active||!wideCamera)return
    const close=(event:KeyboardEvent)=>{if(event.key!=='Escape'||hasOpenOverlay())return;event.preventDefault();event.stopPropagation();(wideCameraTrigger.current?.getClientRects().length?wideCameraTrigger.current:mobileHeadingTrigger.current)?.focus();setWideCamera(false)}
    window.addEventListener('keydown',close,true)
    return()=>window.removeEventListener('keydown',close,true)
  },[wide.active,wideCamera])
  const { items, name, background, busy, onPlace, onSell } = props
  const glass = useRef<HTMLDivElement>(null)
  const capacityAction=useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 320, height: 560 })
  const wideFrame=wideTankFrame(dimensions.width,dimensions.height,wideFill)
  const wideRatio=dimensions.height/Math.max(1,dimensions.width)
  const [decorating,setDecorating]=useState(false)
  const [showEditHint,setShowEditHint]=useState(false)
  useEffect(()=>{
    if(!decorating||!wide.active){setShowEditHint(false);return}
    setShowEditHint(true)
    const timer=setTimeout(()=>setShowEditHint(false),2500)
    return()=>clearTimeout(timer)
  },[decorating,wide.active])
  const decoratingRef=useRef(false)
  decoratingRef.current=decorating
  const panoramaSrc=themePanoramaUrl(background?.image_path)
  const panorama=Boolean(panoramaSrc)
  const [view,setView]=useState(0)
  const [zoom,setZoom]=useState(1)
  const fitted=useFittedTankViewport(0,!wide.active&&!props.overviewContent,true)
  const portraitZoom=fitted.height/(fitted.width*1.6)
  const [verticalView,setVerticalView]=useState(0)
  const [viewRequest,setViewRequest]=useState<{position:number;zoom?:number;y?:number}>({position:1})
  useEffect(() => {
    const element = glass.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() =>
      setDimensions({ width: element.clientWidth, height: element.clientHeight }),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [!!props.overviewContent,wide.active])
  const [editing, setEditing] = useState<{
    id: string
    value: DecorationPlacement
  } | null>(null)
  const [panel,setPanel]=useState<SelectionPanel>(null)
  const [dragging,setDragging]=useState(false)
  const [selectionAnchor,setSelectionAnchor]=useState({x:160,y:160})
  useLayoutEffect(()=>{
    setEditing(null);setDecorating(false);setDragging(false)
    if(wide.active){setWideFill(true);setWideCamera(false)}
    else if(!props.overviewContent){setZoom(portraitZoom);setView(1.5-1/(2*portraitZoom));setVerticalView(0);setViewRequest({position:1.5-1/(2*portraitZoom),zoom:portraitZoom,y:0})}
  },[!!props.overviewContent,props.tankId,wide.active,portraitZoom])
  useLayoutEffect(()=>{
    if(!wide.active)return
    setViewRequest(wideFrame)
  },[wide.active,wideFrame.zoom,wideFrame.position,wideFrame.y])
  useEffect(()=>setPanel('customize'),[editing?.id])
  const panAllowed=useRef(true)
  panAllowed.current=!busy
  const decoration = items.find((item) => item.id === editing?.id)
  const displayed = useMemo(() =>
    editing && decoration
      ? items.map((item) =>
          item.id === editing.id ? { ...item, ...editing.value, editing: true } : item,
        )
      : items, [items, editing, decoration])
  const renderedItems=useMemo(()=>displayed.map(item=>({...item,interaction_locked:busy,placement_locked:!decorating})),[displayed,busy,decorating])
  function arrangementGeometry(item:OwnedCollectible) {
    return decorationGeometry(panorama?tankWorldItem(item,aquariumLayoutWidth,3):item,panorama?aquariumLayoutWidth*3:dimensions.width,panorama?panoramaTankHeight(aquariumLayoutWidth):dimensions.height)
  }
  function selectDecoration(id: string, x?: number, y?: number) {
    if (!decoratingRef.current || busy || !props.onArrange) return
    const item = items.find((item) => item.id === id)
    if (item) {
      const current = editing?.id === id ? { ...item, ...editing.value } : item
      const g = arrangementGeometry(current)
      const value = {
        position_x: x ?? item.position_x ?? 0.2 + (item.animation_seed / 1000000) * 0.6,
        position_y: y ?? item.position_y ?? 0.86,
        rotation: Number(current.rotation ?? 0),
        scale: Number(current.scale ?? 1),
        flipped: current.flipped ?? false,
        ...(item.species.kind==='trash'?{position_locked:current.position_locked??false}:{}),
      }
      const center=g.margin+value.position_x*g.w+g.size/2
      if(panorama&&x===undefined&&canArrangeSpecies(item.species))setViewRequest({position:clampTankCameraView(center/aquariumLayoutWidth-1/(2*zoom),3,zoom)})
      setEditing({
        id,
        value,
      })
    }
  }
  function place(id: string, x: number, y: number) {
    const item=items.find(item=>item.id===id)
    if(!decoratingRef.current||!item||!canArrangeSpecies(item.species))return
    if (busy) return
    if (editing?.id === id) {
      setEditing({
        ...editing,
        value: { ...editing.value, position_x: x, position_y: y },
      })
    }
    onPlace(id, x, y)
  }
  const geometry =
    decoration && editing
      ? arrangementGeometry({ ...decoration, ...editing.value })
      : null
  async function changeDecoration(value: DecorationPlacement) {
    if (!decoratingRef.current || busy || !editing || !props.onArrange) return
    if(panorama)setViewRequest({position:view})
    const previous = editing
    if (geometry && decoration) {
      const next = arrangementGeometry({ ...decoration, ...value })
      const cx = geometry.margin + previous.value.position_x * geometry.w + geometry.size / 2
      const cy = geometry.margin + previous.value.position_y * geometry.h + geometry.size / 2
      value = {
        ...value,
        position_x: next.w ? (cx - next.margin - next.size / 2) / next.w : 0.5,
        position_y: next.h ? (cy - next.margin - next.size / 2) / next.h : 0.5,
      }
      value.position_x = Math.max(0, Math.min(1, value.position_x))
      value.position_y = Math.max(0, Math.min(1, value.position_y))
    }
    setEditing({ ...previous, value })
    try {
      await props.onArrange(previous.id, value)
    } catch (cause) {
      setEditing((current) =>
        current?.id === previous.id && current.value === value ? previous : current,
      )
      throw cause
    }
  }
  function navigate(direction: 'previous' | 'next') {
    if (busy || !props.navigation || props.navigation.count < 2) return
    setEditing(null)
    setDecorating(false)
    props.navigation.onChange(direction)
  }
  const arrangeButton=props.onArrange&&<Button variant={decorating?'default':'secondary'} disabled={busy} aria-label={decorating?'편집 모드 완료':'편집 모드 시작'} aria-pressed={decorating} onClick={()=>{setEditing(null);setWideCamera(false);setDecorating(value=>!value)}} className={`${wide.active?'aquarium-wide-edit':'absolute bottom-3 right-3 z-40'} min-h-11 shrink-0 gap-1.5 rounded-full border border-white/50 px-3 text-xs shadow-sm backdrop-blur-sm`}>{decorating?<Check className="size-4"/>:<SlidersHorizontal className="size-4"/>}<span className="aquarium-wide-long-label">{decorating?'편집 완료':'편집 모드'}</span><span className="aquarium-wide-short-label">{decorating?'완료':'편집'}</span></Button>
  const content=(
    <>
      <AquariumAmbience/>
      {wide.active&&<div className="aquarium-wide-topbar" data-editing={decorating}>
        <div className="aquarium-wide-heading aquarium-wide-desktop-heading"><div className="aquarium-wide-title">{props.selectorControls??<span className="px-2 text-sm font-medium">{name}</span>}<span aria-label="현재 어항" className="shrink-0 pr-3 text-[10px] tabular-nums text-muted-foreground">{(props.navigation?.index??0)+1} / {props.navigation?.count??1}</span></div><button ref={wideCameraTrigger} type="button" aria-label="어항 보기 설정" aria-expanded={wideCamera} aria-controls="wide-aquarium-camera" className="aquarium-wide-view-toggle" onClick={()=>setWideCamera(value=>!value)}><ZoomIn className="size-4"/></button></div>
        <div className="aquarium-wide-mobile-heading">
          <ActionMenu.Root><ActionMenu.Trigger render={<button ref={mobileHeadingTrigger} type="button" aria-label="어항 메뉴" className="aquarium-wide-name-menu"/>}><span className="truncate">{name}</span><Ellipsis aria-hidden="true" className="size-3.5 shrink-0"/></ActionMenu.Trigger><ActionMenu.Portal><ActionMenu.Positioner align="start" sideOffset={6} collisionPadding={8} className="z-50"><ActionMenu.Popup className="min-w-40 rounded-xl border bg-popover p-1.5 text-xs shadow-lg outline-none">
            {props.onRename&&<ActionMenu.Item onClick={props.onRename} className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 outline-none data-highlighted:bg-secondary">이름 바꾸기</ActionMenu.Item>}
            <ActionMenu.Item onClick={()=>setWideCamera(value=>!value)} className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 outline-none data-highlighted:bg-secondary">보기 설정</ActionMenu.Item>
            {decorating&&props.operatorControls&&<ActionMenu.Item onClick={()=>requestAnimationFrame(()=>operatorAction.current?.querySelector<HTMLButtonElement>('button')?.click())} className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 outline-none data-highlighted:bg-secondary">개체 테스트</ActionMenu.Item>}
          </ActionMenu.Popup></ActionMenu.Positioner></ActionMenu.Portal></ActionMenu.Root>
        </div>
        <div role="group" aria-label="가로 어항 도구" className="aquarium-wide-toolbar"><TooltipProvider>{props.operatorControls&&<div ref={operatorAction} className="aquarium-wide-operator">{props.operatorControls}</div>}<div className="aquarium-wide-inventory"><AquariumInventoryDialog capacity={props.tankCapacity} capacityControls={props.capacityControls} items={items} name={name} busy={busy} onSell={onSell} onGiftSent={props.onGiftSent} onStore={props.onStore}/></div>{props.storageControls&&<div className="aquarium-wide-storage">{props.storageControls}</div>}{props.backgroundControls&&<div className="aquarium-wide-theme">{props.backgroundControls}</div>}</TooltipProvider>{arrangeButton}<button type="button" aria-label="가로 화면 종료" onClick={wide.exit} className="aquarium-wide-exit"><Minimize2 aria-hidden="true" className="size-4"/><span>나가기</span></button></div>
      </div>}
      {props.overviewContent??<div ref={fitted.ref} data-testid="aquarium-viewport" className={`relative flex min-h-0 flex-1 flex-col items-center overflow-hidden ${wide.active?'justify-center':'justify-start'}`}>
      {!wide.active&&<div className="absolute inset-x-0 top-0 z-20 grid h-14 w-full shrink-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center border-b border-white/15 bg-blue-100/75 px-3 py-0.5 backdrop-blur-sm">
        <p className="pl-1 text-left text-[11px] tabular-nums text-muted-foreground" aria-live="polite" aria-label="현재 어항">{(props.navigation?.index??0)+1} / {props.navigation?.count??1}</p>
        <div className="flex min-w-0 items-center justify-center text-center">{props.selectorControls??<p className="truncate text-sm">{name}</p>}</div>
        <div className="flex items-center gap-0.5">
          <span className="mr-1 whitespace-nowrap text-[10px] tabular-nums text-primary">{items.length} / {props.tankCapacity??50}</span>
          <ActionMenu.Root><ActionMenu.Trigger render={<Button variant="ghost" size="icon" aria-label="어항 더보기" data-wide-trigger className="size-9 min-h-11 rounded-lg text-primary"/>}><Ellipsis className="size-4"/></ActionMenu.Trigger><ActionMenu.Portal><ActionMenu.Positioner align="end" sideOffset={6} collisionPadding={12} className="z-50"><ActionMenu.Popup className="min-w-44 rounded-xl border border-border/60 bg-popover p-1.5 text-xs shadow-lg outline-none">
           <ActionMenu.Item onClick={wide.enter} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none data-highlighted:bg-secondary"><Maximize2 className="size-4"/>가로로 보기</ActionMenu.Item>
           {panorama&&<ActionMenu.Item onClick={()=>{const next=zoom>portraitZoom+.001?portraitZoom:portraitZoom*1.5;setViewRequest({position:1.5-1/(2*next),zoom:next,y:0})}} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none data-highlighted:bg-secondary"><ZoomIn className="size-4"/>{zoom>portraitZoom+.001?'화면 맞춤':'화면 확대'}</ActionMenu.Item>}
           {props.capacityControls&&<><ActionMenu.Separator className="my-1 h-px bg-border/60"/><ActionMenu.Item onClick={()=>capacityAction.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.click()} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none data-highlighted:bg-secondary"><Plus className="size-4"/>수용량 확장</ActionMenu.Item></>}
          </ActionMenu.Popup></ActionMenu.Positioner></ActionMenu.Portal></ActionMenu.Root>
        </div>
      </div>}
      <div
        ref={glass}
        data-testid="aquarium-glass"
        data-panorama={panorama}
        data-view={panorama?view.toFixed(4):undefined}
        data-portrait={!wide.active}
        className="aquarium-fitted-glass relative min-h-0 shrink-0 overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200"
        style={wide.active?{width:wideFill?'100%':'min(100%, calc(100dvh * 1.875))',height:wideFill?'100%':'min(calc(100vw / 1.875), 100dvh)'}:{width:fitted.width,height:fitted.height}}
        tabIndex={0}
        aria-label={name}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            if(panorama&&!busy)setViewRequest({position:clampTankCameraView(view+(event.key==='ArrowLeft'?-.15:.15),3,zoom)})
            else navigate(event.key === 'ArrowLeft' ? 'previous' : 'next')
          }
        }}
      >
        <div className="absolute inset-0">
        <TankInhabitants
          key={(panorama?`wide:${props.tankId??name}`:'normal')+':'+wide.active+(!wide.active?':'+portraitZoom.toFixed(4):'')}
          showControls={wide.active}
          preview={wide.active}
          fitView={!wide.active&&panorama}
          onWideView={wide.enter}
          world={panorama?{columns:3,overview:true,fixedViewport:true,minZoom:wide.active?1/3:portraitZoom,maxZoom:wide.active?1:portraitZoom*2,onVerticalViewChange:setVerticalView,initialZoom:wide.active?wideFrame.zoom:portraitZoom,initialView:wide.active?wideFrame.position:1.5-1/(2*portraitZoom),preserveArrangement:false,onZoomChange:setZoom,onViewChange:setView,canPan:()=>panAllowed.current}:undefined}
          viewRequest={panorama?viewRequest:undefined}
          scenery={<><AquariumBackdrop key={panorama?'wide':'normal'} background={background} loading={props.loading} panorama={panoramaSrc?{src:panoramaSrc,view,zoom,fixedViewport:true,heightRatio:wide.active?wideRatio:fitted.height/fitted.width,y:verticalView}:undefined} /><TankBubbles /></>}
          items={renderedItems}
          onPlace={place}
          onSelectDecoration={selectDecoration}
          onDragStateChange={setDragging}
          onSelectionPosition={(id,x,y)=>{
            if(id!==editing?.id)return
            setSelectionAnchor(previous=>Math.abs(previous.x-x)<8&&Math.abs(previous.y-y)<8?previous:{x,y})
          }}
          onBackgroundTap={() => setEditing(null)}
          onNavigate={navigate}
        />
        {props.onOverview&&!wide.active&&<button type="button" aria-label="내 어항 목록" data-aquarium-list onClick={props.onOverview} className="absolute left-2 top-2 z-20 inline-flex min-h-9 items-center gap-1 rounded-full border border-white/40 bg-background/75 px-3 text-[11px] text-primary shadow-sm backdrop-blur-sm"><ChevronUp aria-hidden="true" className="size-3.5 rotate-[-90deg]"/><span className="aquarium-label-full">내 어항 목록</span><span className="aquarium-label-short">목록</span></button>}
        </div>
        {!wide.active&&arrangeButton}
        {decorating&&!wide.active&&<p role="status" className="pointer-events-none absolute bottom-16 right-3 z-20 max-w-56 rounded-xl bg-background/90 px-3 py-2 text-[10px] leading-5 text-primary">개체를 선택한 뒤 드래그해서 옮겨요.</p>}
        {decorating && editing && decoration && (
          <SelectionToolbar wide={wide.active} anchor={selectionAnchor} bounds={dimensions} hidden={wide.active&&dragging} topOffset={56} name={decoration.species.name} rarity={decoration.species.rarity} busy={busy} panel={panel} onPanel={setPanel} onClose={()=>setEditing(null)}>
            {panel!=='more'&&<>
            {props.onArrange&&decoration.species.kind==='fish'&&!canArrangeSpecies(decoration.species)&&<FishSizeEditor scale={editing.value.scale} busy={busy} onChange={scale=>changeDecoration({...editing.value,scale})}/>}
            {props.onArrange && canArrangeSpecies(decoration.species) && (
              <DecorationEditor
                key={editing.id}
                name={decoration.species.name}
                value={editing.value}
                busy={busy}
                allowPositionLock={decoration.species.kind==='trash'}
                onChange={changeDecoration}
              />
            )}
            {props.onLayerChange&&<InhabitantLayerEditor key={decoration.id+':layer'} compact value={decoration.display_layer ?? null} automatic={automaticInhabitantDepth(decoration)} busy={busy} onChange={layer => props.onLayerChange!(decoration.id, layer)}/>}
            </>}
            {panel==='more'&&<>
            <CollectibleActions key={decoration.id} item={decoration} tanks={props.tanks} inhabitants={props.inhabitants} capacity={props.tankCapacity} busy={busy} onMove={props.onMove} onStore={props.onStore} onSell={onSell} onDone={() => setEditing(null)}/>
            </>}
          </SelectionToolbar>
        )}
      </div>
      </div>}
      {wide.active&&<>
        {wideCamera&&<button type="button" tabIndex={-1} aria-label="어항 도구 닫기" className="absolute inset-0 z-30 cursor-default" onClick={()=>setWideCamera(false)}/>}
        {showEditHint&&!dragging&&!editing&&<p role="status" className="aquarium-wide-edit-hint">개체를 선택하고 끌어서 옮겨요.</p>}
        {wideCamera&&<div id="wide-aquarium-camera" role="group" aria-label="어항 화면 배율" className="aquarium-wide-camera"><Button variant="ghost" size="icon" aria-label="어항 축소" disabled={zoom<=1/3+.001} onClick={()=>{const next=Math.max(1/3,zoom-.15);setViewRequest({zoom:next,position:clampTankCameraView(view+1/(2*zoom)-1/(2*next),3,next),y:verticalView+wideRatio/(2*zoom)-wideRatio/(2*next)})}}><Minus className="size-4"/></Button><button type="button" onClick={()=>{setWideFill(value=>!value);setViewRequest(wideTankFrame(dimensions.width,dimensions.height,!wideFill))}}>{wideFill?'전체 보기':'화면 채움'}</button><Button variant="ghost" size="icon" aria-label="어항 확대" disabled={zoom>=.999} onClick={()=>{const next=Math.min(1,zoom+.15);setViewRequest({zoom:next,position:clampTankCameraView(view+1/(2*zoom)-1/(2*next),3,next),y:verticalView+wideRatio/(2*zoom)-wideRatio/(2*next)})}}><Plus className="size-4"/></Button></div>}
        <p role="status" className="pointer-events-none absolute top-1/2 left-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-background/85 px-4 py-2 text-xs text-primary landscape:hidden"><Smartphone aria-hidden="true" className="size-4 rotate-90"/>휴대폰을 가로로 돌려주세요</p>
      </>}
      {!wide.active&&<div hidden ref={capacityAction}>{props.capacityControls}</div>}
      {props.nameControls}
      {!wide.active&&<section aria-label="어항 방문과 관리" className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="flex divide-x divide-border"><FriendAquariumPicker/>{props.managementControls}</div>
      </section>}
    </>
  )
  return wide.active?createPortal(<div role="region" aria-label="가로 어항" data-wide-fill={wideFill} className="aquarium-wide-shell fixed inset-0 z-40 flex h-dvh w-screen flex-col overflow-hidden bg-cyan-950">{content}</div>,document.body):content
}
