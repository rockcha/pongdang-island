import { useEffect, useRef, useState } from 'react'
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
import { TankInhabitants } from './tank-inhabitants'
import { TankBubbles } from './tank-bubbles'
import { AquariumInventoryDialog } from './aquarium-inventory-dialog'
import { canArrangeSpecies } from './movement-settings'
import { DecorationEditor } from './decoration-editor'
import { decorationGeometry } from './decoration-geometry'
import { GoldIcon } from '@/features/gold/gold-provider'
import { FriendAquariumPicker } from '@/features/friends/friend-aquarium-picker'
import { appArt } from '@/components/app-art'
import { TooltipProvider } from '@/components/ui/tooltip'

type Props = {
  loading?: boolean
  items: OwnedCollectible[]
  name: string
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
  navigation?: { index: number; count: number; onChange: (direction: 'previous' | 'next') => void }
}
export function AquariumView(props: Props) {
  const { items, name, background, busy, onPlace, onSell } = props
  const glass = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 320, height: 560 })
  const [managementOpen, setManagementOpen] = useState(false)
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
    anchor: { x: number; y: number }
  } | null>(null)
  const toolbar = useRef<HTMLDivElement>(null)
  const infoAnchor = useRef<{id:string;x:number;y:number}|null>(null)
  const selectedId = useRef<string | null>(null)
  selectedId.current = editing?.id ?? null
  const [infoId, setInfoId] = useState<string | null>(null)
  const infoItem = items.find((item) => item.id === infoId)
  const decoration = items.find((item) => item.id === editing?.id)
  const displayed =
    editing && decoration
      ? items.map((item) =>
          item.id === editing.id ? { ...item, ...editing.value, editing: true } : item,
        )
      : items
  function selectDecoration(id: string, x?: number, y?: number) {
    if (busy || !props.onArrange) return
    const item = items.find((item) => item.id === id)
    if (item) {
      infoAnchor.current = null
      const current = editing?.id === id ? { ...item, ...editing.value } : item
      const g = decorationGeometry(current, dimensions.width, dimensions.height)
      const value = {
        position_x: x ?? item.position_x ?? 0.2 + (item.animation_seed / 1000000) * 0.6,
        position_y: y ?? item.position_y ?? 0.86,
        rotation: Number(current.rotation ?? 0),
        scale: Number(current.scale ?? 1),
        flipped: current.flipped ?? false,
        ...(item.species.kind==='trash'?{position_locked:current.position_locked??false}:{}),
      }
      setEditing({
        id,
        value,
        anchor: {
          x: g.margin + value.position_x * g.w + g.size / 2,
          y: g.margin + value.position_y * g.h,
        },
      })
    }
  }
  function place(id: string, x: number, y: number) {
    if (!canArrangeSpecies(items.find((item) => item.id === id)!.species)) return
    if (busy) return
    if (editing?.id === id) {
      const g = decorationGeometry(
        { ...decoration!, ...editing.value },
        dimensions.width,
        dimensions.height,
      )
      setEditing({
        ...editing,
        value: { ...editing.value, position_x: x, position_y: y },
        anchor: { x: g.margin + x * g.w + g.size / 2, y: g.margin + y * g.h },
      })
    }
    onPlace(id, x, y)
  }
  const geometry =
    decoration && editing
      ? decorationGeometry({ ...decoration, ...editing.value }, dimensions.width, dimensions.height)
      : null
  async function changeDecoration(value: DecorationPlacement) {
    if (!editing || !props.onArrange) return
    const previous = editing
    if (geometry && decoration) {
      const next = decorationGeometry(
        { ...decoration, ...value },
        dimensions.width,
        dimensions.height,
      )
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
  // Screen-space controls stay the same size regardless of decoration scale.
  const toolbarWidth = decoration?.species.kind==='trash'?212:decoration && canArrangeSpecies(decoration.species) ? 176 : 112
  const toolbarX =
    geometry && editing
      ? Math.max(
          toolbarWidth / 2 + 8,
          Math.min(dimensions.width - toolbarWidth / 2 - 8, editing.anchor.x),
        )
      : 0
  const toolbarY =
    geometry && editing
      ? Math.max(
          (toolbar.current?.offsetHeight || 44) + 8,
          Math.min(
            dimensions.height - 8,
            editing.anchor.y - 6,
          ),
        )
      : 8
  function navigate(direction: 'previous' | 'next') {
    if (busy || !props.navigation || props.navigation.count < 2) return
    setEditing(null)
    props.navigation.onChange(direction)
  }
  return (
    <>
      <div
        ref={glass}
        data-testid="aquarium-glass"
        className="relative min-h-0 w-full flex-1 overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200"
        tabIndex={0}
        aria-label={name}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            navigate(event.key === 'ArrowLeft' ? 'previous' : 'next')
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
          scenery={<><AquariumBackdrop background={background} loading={props.loading} /><TankBubbles /></>}
          items={displayed.map((item) => ({ ...item, interaction_locked: busy }))}
          onPlace={place}
          onSelectDecoration={selectDecoration}
          onSelectionPosition={(id, x, y) => {
            if (id !== selectedId.current || !toolbar.current) return
            if (decoration && !canArrangeSpecies(decoration.species)) {
              infoAnchor.current ??= {id,x,y}
              x = infoAnchor.current.x
              y = infoAnchor.current.y
            }
            const element = toolbar.current
            const width = glass.current?.clientWidth ?? dimensions.width
            element.style.left = `${Math.max(toolbarWidth / 2 + 8, Math.min(width - toolbarWidth / 2 - 8, x))}px`
            element.style.top = `${Math.max(element.offsetHeight + 8, Math.min((glass.current?.clientHeight || dimensions.height) - 8, y - 6))}px`
          }}
          onBackgroundTap={() => setEditing(null)}
          onNavigate={navigate}
        />
        {editing && decoration && (
          <div
            ref={toolbar}
            className="absolute z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1.5"
            style={{ left: toolbarX, top: toolbarY, width: toolbarWidth }}
          >
            <Button
              variant="secondary"
              className="order-2 min-h-11 gap-1.5 rounded-lg border bg-background/95 px-3 text-xs shadow-sm"
              onClick={() => setInfoId(decoration.id)}
            >
              <Info className="size-4" />
              정보 보기
            </Button>
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
          </div>
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
