import {Menu as ActionMenu} from '@base-ui/react/menu'
import { useEffect, useLayoutEffect,useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {createPortal} from 'react-dom'
import { ChevronDown, ChevronUp, Info,Menu,Minimize2,Smartphone,Minus,Plus,Paintbrush,Check,Ellipsis,Maximize2,ZoomIn } from 'lucide-react'
import {useAquariumWideMode} from './use-aquarium-wide-mode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CollectiblePreview } from '@/features/collection/collectible-preview'
import { CollectibleKindIcon } from '@/features/collection/collectible-kind-icon'
import { rarities } from '@/lib/game/rarity'
import { kindLabels } from '@/features/collection/api'
import { PrimaryHabitat } from '@/features/collection/native-region-badge'
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
import { GoldIcon } from '@/features/gold/gold-provider'
import { FriendAquariumPicker } from '@/features/friends/friend-aquarium-picker'
import { appArt } from '@/components/app-art'
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

type Props = {
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
  const wide=useAquariumWideMode()
  const [wideMenu,setWideMenu]=useState(false)
  const { items, name, background, busy, onPlace, onSell } = props
  const glass = useRef<HTMLDivElement>(null)
  const capacityAction=useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 320, height: 560 })
  const [decorating,setDecorating]=useState(false)
  const decoratingRef=useRef(false)
  decoratingRef.current=decorating
  const [managementOpen, setManagementOpen] = useState(false)
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
  useLayoutEffect(()=>{
    setEditing(null);setDecorating(false)
    if(wide.active){setZoom(1/3);setView(0);setVerticalView(0);setViewRequest({position:0});setManagementOpen(false);setWideMenu(false)}
    else if(!props.overviewContent){setZoom(portraitZoom);setView(1.5-1/(2*portraitZoom));setVerticalView(0);setViewRequest({position:1.5-1/(2*portraitZoom),zoom:portraitZoom,y:0})}
  },[!!props.overviewContent,props.tankId,wide.active,portraitZoom])
  useEffect(()=>setPanel(null),[editing?.id])
  const [infoId, setInfoId] = useState<string | null>(null)
  const panAllowed=useRef(true)
  panAllowed.current=!busy
  const infoItem = items.find((item) => item.id === infoId)
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
  const content=(
    <>
      <AquariumAmbience/>
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
        style={wide.active?{width:'min(100vw, calc(100dvh * 1.875))',height:'min(calc(100vw / 1.875), 100dvh)'}:{width:fitted.width,height:fitted.height}}
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
          world={panorama?{columns:3,overview:true,fixedViewport:true,minZoom:wide.active?1/3:portraitZoom,maxZoom:wide.active?1:portraitZoom*2,onVerticalViewChange:setVerticalView,initialZoom:wide.active?1/3:portraitZoom,initialView:wide.active?0:1.5-1/(2*portraitZoom),preserveArrangement:false,onZoomChange:setZoom,onViewChange:setView,canPan:()=>panAllowed.current}:undefined}
          viewRequest={panorama?viewRequest:undefined}
          scenery={<><AquariumBackdrop key={panorama?'wide':'normal'} background={background} loading={props.loading} panorama={panoramaSrc?{src:panoramaSrc,view,zoom,fixedViewport:true,heightRatio:wide.active?1.6/3:fitted.height/fitted.width,y:verticalView}:undefined} /><TankBubbles /></>}
          items={renderedItems}
          onPlace={place}
          onSelectDecoration={selectDecoration}
          onBackgroundTap={() => setEditing(null)}
          onNavigate={navigate}
        />
        {props.onOverview&&!wide.active&&<button type="button" aria-label="내 어항 목록" data-aquarium-list onClick={props.onOverview} className="absolute left-2 top-2 z-20 inline-flex min-h-9 items-center gap-1 rounded-full border border-white/40 bg-background/75 px-3 text-[11px] text-primary shadow-sm backdrop-blur-sm"><ChevronUp aria-hidden="true" className="size-3.5 rotate-[-90deg]"/><span className="aquarium-label-full">내 어항 목록</span><span className="aquarium-label-short">목록</span></button>}
        </div>
        {props.onArrange&&<Button variant={decorating?'default':'secondary'} disabled={busy} aria-label={decorating?'꾸미기 모드 완료':'꾸미기 모드 시작'} aria-pressed={decorating} onClick={()=>{setEditing(null);setDecorating(value=>!value)}} className="absolute bottom-3 right-3 z-40 min-h-11 gap-1.5 rounded-full border border-white/50 px-3 text-xs shadow-sm backdrop-blur-sm">{decorating?<Check className="size-4"/>:<Paintbrush className="size-4"/>}{decorating?'완료':'꾸미기'}</Button>}
        {decorating&&<p role="status" className="pointer-events-none absolute bottom-16 right-3 z-20 max-w-56 rounded-xl bg-background/90 px-3 py-2 text-[10px] leading-5 text-primary">개체를 선택한 뒤 드래그해서 옮겨요.</p>}
        {decorating && editing && decoration && (
          <SelectionToolbar wide={wide.active} topOffset={56} name={decoration.species.name} busy={busy} panel={panel} onPanel={setPanel} onClose={()=>setEditing(null)}>
            {panel==='customize'&&<>
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
            {props.onLayerChange&&<Button variant="ghost" className="min-h-8 rounded-lg bg-background/75 px-3 text-[11px]" onClick={()=>setPanel('order')}>겹침 순서</Button>}
            </>}
            {panel==='order'&&props.onLayerChange&&<><InhabitantLayerEditor key={decoration.id} value={decoration.display_layer ?? null} automatic={automaticInhabitantDepth(decoration)} busy={busy} onChange={layer => props.onLayerChange!(decoration.id, layer)}/><Button variant="ghost" className="min-h-8 rounded-lg bg-background/75 px-3 text-[11px]" onClick={()=>setPanel('customize')}>꾸미기로 돌아가기</Button></>}
            {panel==='more'&&<>
            <Button variant="ghost" className="min-h-11 w-full justify-start gap-2 rounded-lg bg-background/75 text-xs" onClick={()=>setInfoId(decoration.id)}><Info className="size-4"/>정보 보기</Button>
            <CollectibleActions key={decoration.id} item={decoration} tanks={props.tanks} inhabitants={props.inhabitants} capacity={props.tankCapacity} busy={busy} onMove={props.onMove} onStore={props.onStore} onSell={onSell} onDone={() => setEditing(null)}/>
            </>}
          </SelectionToolbar>
        )}
      </div>
      </div>}
      {wide.active&&<>
        <div className="absolute left-[max(.5rem,env(safe-area-inset-left))] top-[max(.5rem,env(safe-area-inset-top))] z-40"><button type="button" aria-expanded={wideMenu} aria-controls="wide-aquarium-menu" onClick={()=>setWideMenu(value=>!value)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/40 bg-background/85 px-4 text-xs text-primary shadow-sm backdrop-blur-sm"><Menu aria-hidden="true" className="size-4"/>메뉴</button></div>
        <button type="button" onClick={wide.exit} className="absolute right-[max(.5rem,env(safe-area-inset-right))] top-[max(.5rem,env(safe-area-inset-top))] z-40 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/40 bg-background/85 px-4 text-xs text-primary shadow-sm backdrop-blur-sm"><Minimize2 aria-hidden="true" className="size-4"/>가로 화면 종료</button>
        {wideMenu&&<nav id="wide-aquarium-menu" aria-label="가로 어항 메뉴" className="aquarium-wide-dock absolute left-2 top-14 z-40 max-h-[calc(100dvh-4rem)] w-64 overflow-y-auto overscroll-contain rounded-2xl border border-white/50 bg-background/95 p-3 shadow-lg backdrop-blur-sm">
          <p className="mb-2 truncate text-center text-xs text-muted-foreground">{name}</p>
          <TooltipProvider><div className="aquarium-manager mt-2 grid grid-cols-2 items-center gap-2 [&_button]:w-full [&_a]:mx-auto"><AquariumInventoryDialog items={items} name={name} busy={busy} onSell={onSell} onGiftSent={props.onGiftSent} onStore={props.onStore}/>{props.storageControls}{props.managementControls}</div></TooltipProvider>

          {props.onOverview&&<button type="button" className="aquarium-overview-shortcut min-h-11 w-full rounded-lg border border-border text-xs text-primary" onClick={()=>{wide.exit();props.onOverview?.()}}>내 어항 목록</button>}
          <Button variant="ghost" className="aquarium-menu-collapse mt-2 min-h-10 w-full text-xs" onClick={()=>setWideMenu(false)}>메뉴 접기</Button>
        </nav>}
        {wideMenu&&<div role="group" aria-label="어항 화면 배율" className="aquarium-wide-camera absolute bottom-2 left-24 z-40 hidden landscape:flex items-center justify-between gap-2 rounded-lg bg-secondary/50 p-1"><Button variant="ghost" size="icon" className="min-h-10 min-w-10" aria-label="어항 축소" disabled={zoom<=1/3+.001} onClick={()=>{const next=Math.max(1/3,zoom-.15);setViewRequest({zoom:next,position:clampTankCameraView(view+1/(2*zoom)-1/(2*next),3,next),y:verticalView+1.6/(6*zoom)-1.6/(6*next)})}}><Minus className="size-4"/></Button><button type="button" className="min-h-10 text-xs text-primary" onClick={()=>setViewRequest({position:0,zoom:1/3,y:0})}>전체 맞춤</button><Button variant="ghost" size="icon" className="min-h-10 min-w-10" aria-label="어항 확대" disabled={zoom>=.999} onClick={()=>{const next=Math.min(1,zoom+.15);setViewRequest({zoom:next,position:clampTankCameraView(view+1/(2*zoom)-1/(2*next),3,next),y:verticalView+1.6/(6*zoom)-1.6/(6*next)})}}><Plus className="size-4"/></Button></div>}
        <p role="status" className="pointer-events-none absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-background/85 px-4 py-2 text-xs text-primary landscape:hidden"><Smartphone aria-hidden="true" className="size-4 rotate-90"/>휴대폰을 가로로 돌려주세요</p>
      </>}
      <div hidden ref={capacityAction}>{props.capacityControls}</div>
      {props.nameControls}
      <Dialog
        open={!!infoItem}
        onOpenChange={(open) => {
          if (!open) setInfoId(null)
        }}
      >
        <DialogContent className="aquarium-work-panel aquarium-detail-panel gap-4 overflow-y-auto rounded-xl sm:max-w-sm">
          <DialogHeader className="pr-7">
            <DialogTitle className="flex items-center gap-2">
              {infoItem && (
                <CollectibleKindIcon
                  kind={infoItem.species.kind}
                  className="size-6 shrink-0 text-primary"
                />
              )}
              {infoItem?.species.name}
            </DialogTitle>
            <DialogDescription>
              {infoItem && kindLabels[infoItem.species.kind]} ·{' '}
              {infoItem && rarities[infoItem.species.rarity].label}
            </DialogDescription>
          </DialogHeader>
          {infoItem && (
            <>
              <div className="grid place-items-center rounded-xl bg-secondary/40 py-5">
                <CollectiblePreview species={infoItem.species} />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {infoItem.species.description}
              </p>
              <div className="flex items-center justify-between border-t pt-3 text-xs">
                <span className="text-muted-foreground">가치</span>
                <span className="flex items-center gap-1 text-primary">
                  <GoldIcon className="size-5" />
                  {infoItem.species.sell_price.toLocaleString('ko-KR')}
                </span>
              </div>
              <PrimaryHabitat species={infoItem.species} />
            </>
          )}
        </DialogContent>
      </Dialog>
      {!wide.active&&<section
        aria-label="어항 방문과 관리"
        className="relative shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
      >
        <div
          hidden={!managementOpen}
          className="absolute inset-x-0 bottom-full z-30 border-t border-border bg-background/95 p-3 shadow-sm backdrop-blur-md"
        >
          <TooltipProvider>
            <div
              role="group"
              aria-label="어항 관리 도구"
              className="aquarium-manager grid grid-cols-3 items-center gap-2 rounded-lg [&_button]:w-full [&_a]:mx-auto"
            >
              <AquariumInventoryDialog
                items={items}
                name={name}
                busy={busy}
                onSell={onSell}
                onGiftSent={props.onGiftSent}
                onStore={props.onStore}
              />
              {props.storageControls}
              {props.managementControls}
            </div>
          </TooltipProvider>
        </div>
        <div className="flex divide-x divide-border">
          <FriendAquariumPicker />
          <Button
            variant="ghost"
            className="min-h-12 flex-1 rounded-none text-xs"
            aria-expanded={managementOpen}
            onClick={() => setManagementOpen((value) => !value)}
          >
            <appArt.settings className="size-6" />
            어항 관리
            {managementOpen ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </Button>
        </div>
      </section>}
    </>
  )
  return wide.active?createPortal(<div role="region" aria-label="가로 어항 꾸미기" className="fixed inset-0 z-40 flex h-dvh w-screen flex-col overflow-hidden bg-cyan-950">{content}</div>,document.body):content
}
