import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Info } from 'lucide-react'
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
import { clampTankView, tankWorldItem } from './tank-world'
import { SelectionToolbar } from './selection-toolbar'
import type { SelectionPanel } from './selection-toolbar'

type Props = {
  loading?: boolean
  items: OwnedCollectible[]
  name: string
  tankId?: string
  background?: { name: string; image_path: string }
  selectorControls?: ReactNode
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
  const { items, name, background, busy, onPlace, onSell } = props
  const glass = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 320, height: 560 })
  const [managementOpen, setManagementOpen] = useState(false)
  const panoramaSrc=themePanoramaUrl(background?.image_path)
  const panorama=Boolean(panoramaSrc)
  const [view,setView]=useState(1)
  const [viewRequest,setViewRequest]=useState({position:1})
  useEffect(() => {
    const element = glass.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() =>
      setDimensions({ width: element.clientWidth, height: element.clientHeight }),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const [editing, setEditing] = useState<{
    id: string
    value: DecorationPlacement
  } | null>(null)
  const [panel,setPanel]=useState<SelectionPanel>(null)
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
  const renderedItems=useMemo(()=>displayed.map(item=>({...item,interaction_locked:busy})),[displayed,busy])
  function arrangementGeometry(item:OwnedCollectible) {
    return decorationGeometry(panorama?tankWorldItem(item,dimensions.width,3):item,dimensions.width*(panorama?3:1),dimensions.height)
  }
  function selectDecoration(id: string, x?: number, y?: number) {
    if (busy || !props.onArrange) return
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
      if(panorama&&x===undefined&&canArrangeSpecies(item.species))setViewRequest({position:clampTankView(center/dimensions.width-.5)})
      setEditing({
        id,
        value,
      })
    }
  }
  function place(id: string, x: number, y: number) {
    if (!canArrangeSpecies(items.find((item) => item.id === id)!.species)) return
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
    if (!editing || !props.onArrange) return
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
    props.navigation.onChange(direction)
  }
  return (
    <>
      <AquariumAmbience/>
      <div
        ref={glass}
        data-testid="aquarium-glass"
        data-panorama={panorama}
        data-view={panorama?view.toFixed(4):undefined}
        className="relative min-h-0 w-full flex-1 overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200"
        tabIndex={0}
        aria-label={name}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            if(panorama&&!busy)setViewRequest({position:clampTankView(view+(event.key==='ArrowLeft'?-.15:.15))})
            else navigate(event.key === 'ArrowLeft' ? 'previous' : 'next')
          }
        }}
      >
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 border-b border-white/15 bg-background/25 backdrop-blur-sm px-3 py-0.5">
          <div
            role="group"
            aria-label="어항 이동"
            className="flex w-full min-w-0 max-w-full items-center justify-center gap-1"
          >
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 shrink-0"
              aria-label="이전 어항"
              disabled={busy || !props.navigation || props.navigation.count < 2}
              onClick={() => navigate('previous')}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex w-40 min-w-0 items-center justify-center gap-1">
              <div className="min-w-0">
                {props.selectorControls ?? <p className="truncate text-sm">{name}</p>}
                <p
                  className="text-center text-[10px] tabular-nums text-muted-foreground"
                  aria-live="polite"
                  aria-label="현재 어항"
                >
                  {(props.navigation?.index ?? 0) + 1} / {props.navigation?.count ?? 1}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 shrink-0"
              aria-label="다음 어항"
              disabled={
                busy || !props.navigation || props.navigation.count < 2
              }
              onClick={() => navigate('next')}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        <TankInhabitants
          key={panorama?`wide:${props.tankId??name}`:'normal'}
          world={panorama?{columns:3,initialView:1,preserveArrangement:false,onViewChange:setView,canPan:()=>panAllowed.current}:undefined}
          viewRequest={panorama?viewRequest:undefined}
          scenery={<><AquariumBackdrop key={panorama?'wide':'normal'} background={background} loading={props.loading} panorama={panoramaSrc?{src:panoramaSrc,view}:undefined} /><TankBubbles /></>}
          items={renderedItems}
          onPlace={place}
          onSelectDecoration={selectDecoration}
          onBackgroundTap={() => setEditing(null)}
          onNavigate={navigate}
        />
        {editing && decoration && (
          <SelectionToolbar name={decoration.species.name} busy={busy} panel={panel} onPanel={setPanel} onClose={()=>setEditing(null)}>
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
      {props.nameControls}
      <Dialog
        open={!!infoItem}
        onOpenChange={(open) => {
          if (!open) setInfoId(null)
        }}
      >
        <DialogContent className="gap-4 rounded-xl sm:max-w-sm">
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
      <section
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
      </section>
    </>
  )
}
