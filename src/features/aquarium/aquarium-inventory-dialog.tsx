import { EmptyState } from '@/components/empty-state'
import { appArt } from '@/components/app-art'
import { CollectibleSearchInput } from './collectible-search-input'
import { RaritySelect } from '@/components/rarity-select'
import { RegionConceptSelect, matchesRegionConcept } from '@/components/region-concept-select'
import { Label } from '@/components/ui/label'
import { useRef, useState } from 'react'
import type {ReactNode} from 'react'
import { Minus, Plus,SlidersHorizontal } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CollectibleSaleDialog } from './collectible-sale-dialog'
import { CollectibleQuantityCard } from './collectible-quantity-card'
import type { CollectibleKind, OwnedCollectible } from '@/features/collection/api'
import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
import { GoldIcon } from '@/features/gold/gold-provider'
import { groupCollectibles } from './collectible-groups'
import type { CollectibleGroup } from './collectible-groups'

import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import { SendGiftDialog } from '@/features/gifts/send-gift-dialog'
import { AquariumToolButton } from './aquarium-tool-button'
import { storageError } from './api'
import {AquariumSearchToggle} from './aquarium-panel-controls'

const { list: ListFilter, storage: Archive, mailGift: Gift } = appArt

export function AquariumInventoryDialog({
  items,
  name,
  busy,
  onSell,
  onGiftSent,
  onStore,
  triggerLabel='목록',
  capacityControls,
  capacity,
  open:controlledOpen,
  onOpenChange,
  hideTrigger=false,
}: {
  items: OwnedCollectible[]
  name: string
  busy: boolean
  onSell: (ids: string[]) => Promise<void>
  onGiftSent?: (ids: string[]) => void
  onStore?: (ids: string[]) => Promise<void>
  triggerLabel?:string
  capacityControls?:ReactNode
  capacity?:number
  open?:boolean
  onOpenChange?:(open:boolean)=>void
  hideTrigger?:boolean
}) {
  const [internalOpen, setInternalOpen] = useState(false),
    [category, setCategory] = useState<CollectibleKind | 'all'>('all'),
    [rarity, setRarity] = useState<Rarity | 'all'>('all')
  const open=controlledOpen??internalOpen
  const setOpen=(value:boolean)=>{setInternalOpen(value);onOpenChange?.(value)}
  const [query, setQuery] = useState('')
  const [concept, setConcept] = useState('all')
  const [searchOpen,setSearchOpen]=useState(false)
  const [filtersOpen,setFiltersOpen]=useState(false)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [storeIds, setStoreIds] = useState<string[] | null>(null),
    [storeError, setStoreError] = useState('')
  const [batch, setBatch] = useState<OwnedCollectible[] | null>(null)
  const [pending, setPending] = useState<CollectibleGroup | null>(null),
    [quantity, setQuantity] = useState(1),
    [selling, setSelling] = useState(false),
    [error, setError] = useState('')
  const locked = useRef(false)
  const groups = groupCollectibles(items).sort(
    (a, b) => rarities[a.species.rarity].rank - rarities[b.species.rarity].rank,
  )
  const movableIds = (group: CollectibleGroup) =>
    group.items
      .filter((item) => !item.id.startsWith('test-') && (item.species.kind!=='map'&&item.species.kind!=='relic'))
      .slice(0, 50)
      .map((item) => item.id)
  const filtered = groups.filter(
    (group) =>
      (category === 'all' || group.species.kind === category) &&
      (rarity === 'all' || group.species.rarity === rarity) &&
      matchesRegionConcept(group.species, concept) &&
      group.species.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  const selected = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => selection.has(item.id)),
      sellable: group.sellable.filter((item) => selection.has(item.id)),
    }))
    .filter((group) => group.items.length)
  const movable = selected.flatMap(movableIds).slice(0, 50)
  const sellable = selected.flatMap((group) => group.sellable).slice(0, 100)
  const total = sellable.reduce((sum, item) => sum + item.species.sell_price, 0)
  const available =
    batch ??
    (pending
      ? (groups.find((group) => group.species.id === pending.species.id)?.sellable ?? [])
      : [])
  const valid =
    Number.isInteger(quantity) && quantity >= 1 && quantity <= Math.min(available.length, 100)
  async function sell() {
    if (locked.current || busy || !valid) return
    locked.current = true
    setSelling(true)
    setError('')
    try {
      await onSell(available.slice(0, quantity).map((item) => item.id))
      setPending(null)
      setBatch(null)
      setSelection(new Set())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '판매하지 못했어요. 다시 시도해주세요.')
    } finally {
      locked.current = false
      setSelling(false)
    }
  }
  return (
    <TooltipProvider>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!selling) {
            setOpen(value)
            if (value) setSelection(new Set())
          }
        }}
      >
        {!hideTrigger&&<AquariumToolButton
          prominent
          count={items.length}
          label={triggerLabel}
          icon={<ListFilter className="size-8" />}
        />}
        <DialogContent className="aquarium-work-panel aquarium-item-panel bottom-0 top-auto left-0 flex h-[88dvh] max-h-[88dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-3 overflow-hidden rounded-t-2xl rounded-b-none pb-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <DialogHeader className="shrink-0 pr-7">
            <DialogTitle className="flex items-center gap-2">
              <ListFilter aria-hidden="true" className="size-5 shrink-0 text-primary" />
              <span className="aquarium-panel-name min-w-0 truncate">{name}</span>{' '}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {capacity===undefined?`${items.length}개`:`${items.length} / ${capacity}`}
              </span>
            </DialogTitle>
            <AquariumSearchToggle open={searchOpen} onChange={setSearchOpen} active={!!query}/>
          </DialogHeader>
          {capacityControls&&<div className="flex shrink-0 justify-end border-b border-border/40 pb-1">{capacityControls}</div>}
          <div
            className="aquarium-panel-categories segmented-control grid shrink-0 grid-cols-4 gap-1"
            role="group"
            aria-label="개체 카테고리"
          >
            {(
              [
                { id: 'all', name: '전체' },
                { id: 'fish', name: '물고기' },
                { id: 'decoration', name: '장식물' },
                { id: 'trash', name: '쓰레기' },
              ] as const
            ).map((item) => (
              <Button
                key={item.id}
                size="sm"
                className="min-h-16 min-w-0 flex-col gap-1 px-1 py-2 text-[11px]"
                variant={category === item.id ? 'secondary' : 'ghost'}
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.id === 'all' ? (
                  <appArt.list className="size-7" />
                ) : item.id === 'fish' ? (
                  <appArt.fish className="size-7" />
                ) : item.id === 'decoration' ? (
                  <appArt.decoration className="size-7" />
                ) : (
                  <appArt.trash className="size-7" />
                )}
                <span>{item.name}</span>
              </Button>
            ))}
          </div>
          <div className="aquarium-panel-search flex min-w-0 shrink-0 items-center gap-2" data-expanded={searchOpen}>
            <CollectibleSearchInput
              value={query}
              disabled={busy || selling}
              onChange={(value) => {
                setQuery(value)
                setSelection(new Set())
              }}
            />
            <Button variant="outline" className="aquarium-filter-toggle aquarium-inventory-filter-toggle min-h-11 shrink-0 gap-1 text-xs" aria-label="필터" aria-expanded={filtersOpen} data-active={concept!=='all'||rarity!=='all'} onClick={()=>setFiltersOpen(value=>!value)}><SlidersHorizontal className="size-4"/><span>필터</span></Button>
          </div>
          <div className="aquarium-inventory-filters flex min-w-0 shrink-0 items-center gap-2" data-expanded={filtersOpen}>
            <RegionConceptSelect
              value={concept}
              disabled={busy || selling}
              onChange={(value) => {
                setConcept(value)
                setSelection(new Set())
              }}
            />
            <RaritySelect
              value={rarity}
              disabled={busy || selling}
              onChange={(value) => {
                setRarity(value)
                setSelection(new Set())
              }}
            />
          </div>
          <div className="-mx-4 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            {filtered.length ? (
              <ul className="aquarium-panel-grid grid grid-cols-3 border-t border-border/60">
                {filtered.map((group) => {
                  const eligible = group.items.filter(
                    (item) => !item.id.startsWith('test-') && (item.species.kind!=='map'&&item.species.kind!=='relic'),
                  )
                  const value = eligible.filter((item) => selection.has(item.id)).length
                  return (
                    <li key={group.species.id} className="min-w-0">
                      <CollectibleQuantityCard
                        species={group.species}
                        count={group.items.length}
                        value={value}
                        max={Math.min(eligible.length, Math.max(0, 50 - selection.size + value))}
                        disabled={busy || selling}
                        onChange={(quantity) =>
                          setSelection((old) => {
                            const next = new Set(old)
                            group.items.forEach((item) => next.delete(item.id))
                            eligible.slice(0, quantity).forEach((item) => next.add(item.id))
                            return next
                          })
                        }
                      />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState className="flex-1 px-4 py-8">조건에 맞는 개체가 없어요.</EmptyState>
            )}
          </div>
          {selected.length > 0 && (
            <div
              className="aquarium-selected-preview flex min-h-12 shrink-0 items-center gap-3 overflow-x-auto border-t pt-2"
              aria-label="선택한 개체"
            >
              {selected.map((group) => (
                <div key={group.species.id} className="relative shrink-0 px-1 pt-3">
                  <span className="absolute inset-x-0 top-0 text-center text-[10px] tabular-nums text-primary">
                    ×{group.items.length}
                  </span>
                  <CollectibleThumbnail
                    path={group.species.thumbnail_path}
                    name={group.species.name}
                    className="size-9"
                  />
                </div>
              ))}
            </div>
          )}
          {selection.size>0&&<div className="aquarium-inventory-count"><span>{selection.size}개 선택</span><Button variant="ghost" size="sm" disabled={busy||selling} onClick={()=>setSelection(new Set())}>선택 해제</Button></div>}
          <div className="aquarium-panel-actions -mx-4 -mb-4 -mt-3 grid shrink-0 grid-cols-3 border-t pb-[env(safe-area-inset-bottom)]">
            <Button
              variant="secondary"
              aria-label={movable.length + '개 보관함으로'}
              className="h-16 min-w-0 gap-1 rounded-none border-r px-2"
              disabled={busy || selling || !onStore || !movable.length}
              onClick={() => {
                setStoreError('')
                setStoreIds([...movable])
              }}
            >
              <Archive className="size-5" />
              <span className="aquarium-action-label text-xs">보관함으로</span>
            </Button>
            {selected.length === 1 ? (
              <SendGiftDialog
                species={selected[0].species}
                items={selected[0].items}
                disabled={busy || selling || (selected[0].species.kind==='map'||selected[0].species.kind==='relic')}
                onSent={(ids) => {
                  onGiftSent?.(ids)
                  setSelection(new Set())
                }}
              />
            ) : (
              <Button
                variant="secondary"
                className="h-16 min-w-0 gap-1 rounded-none border-r px-2"
                aria-label="선물할 종류 하나를 선택해주세요"
                disabled
              >
                <Gift className="size-5" />
                <span className="aquarium-action-label text-xs">선물하기</span>
              </Button>
            )}
            <Button
              className="h-16 min-w-0 gap-2 rounded-none"
              aria-label={'선택한 개체 판매 ' + total + ' 골드'}
              disabled={busy || selling || !sellable.length}
              onClick={() => {
                setError('')
                setPending(null)
                setBatch(sellable)
                setQuantity(sellable.length)
              }}
            >
              <span className="text-xs">판매</span>
              <GoldIcon className="size-8" />
              <span className="tabular-nums">{total.toLocaleString('ko-KR')}</span>
            </Button>
          </div>
          <ConfirmDialog
            illustration="aquarium"
            open={storeIds !== null}
            onOpenChange={(value) => {
              if (!value) setStoreIds(null)
            }}
            title="보관함에 보관할까요?"
            description={`선택한 ${storeIds?.length ?? 0}개를 보관함으로 옮겨요.`}
            busy={selling}
            error={storeError}
            confirmDisabled={busy || !storeIds?.length}
            onConfirm={async () => {
              if (locked.current || !onStore || !storeIds?.length) return
              locked.current = true
              setSelling(true)
              setStoreError('')
              try {
                await onStore(storeIds)
                setSelection(new Set())
                setStoreIds(null)
              } catch (cause) {
                setStoreError(storageError(cause))
              } finally {
                locked.current = false
                setSelling(false)
              }
            }}
          />
          <CollectibleSaleDialog
            items={valid ? available.slice(0, quantity) : []}
            open={!!pending || !!batch}
            onOpenChange={(value) => {
              if (!value) {
                setPending(null)
                setBatch(null)
              }
            }}
            busy={selling}
            disabled={busy || !valid}
            error={error}
            onConfirm={() => void sell()}
          >
            {!batch && (
              <>
                <Label htmlFor="sell-quantity">판매 수량 · 보유 {available.length}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="판매 수량 줄이기"
                    disabled={selling || quantity <= 1}
                    onClick={() => setQuantity((value) => value - 1)}
                  >
                    <Minus />
                  </Button>
                  <Input
                    id="sell-quantity"
                    type="number"
                    min={1}
                    max={Math.min(available.length, 100)}
                    value={quantity}
                    disabled={selling}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    className="text-center tabular-nums"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="판매 수량 늘리기"
                    disabled={selling || quantity >= Math.min(available.length, 100)}
                    onClick={() => setQuantity((value) => value + 1)}
                  >
                    <Plus />
                  </Button>
                </div>
              </>
            )}
          </CollectibleSaleDialog>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
