import { EmptyState } from '@/components/empty-state'
import { appArt } from '@/components/app-art'
import { CollectibleSearchInput } from './collectible-search-input'
import { RaritySelect } from '@/components/rarity-select'
import { RegionConceptSelect } from '@/components/region-concept-select'
import type { RarityFilter } from '@/components/rarity-select'
import { useEffect, useRef, useState } from 'react'
import { groupCollectibles } from './collectible-groups'
import { CollectibleQuantityCard } from './collectible-quantity-card'
import { rarities } from '@/lib/game/rarity'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { GoldIcon } from '@/features/gold/gold-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CollectibleSaleDialog } from './collectible-sale-dialog'
import { SendGiftDialog } from '@/features/gifts/send-gift-dialog'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import type { OwnedCollectible } from '@/features/collection/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AquariumToolButton } from './aquarium-tool-button'
import { loadCollectibleStorage, storageError } from './api'
import type { AquariumState, CollectibleStorage } from './api'

const { storage: Archive, aquarium: Aquarium, mailGift: Gift } = appArt

export function CollectibleStorageDialog({
  state,
  currentTankId,
  busy,
  onAssign,
  onSell,
  onGiftSent,
}: {
  state: AquariumState
  currentTankId: string
  busy: boolean
  onAssign: (ids: string[], tankId: string) => Promise<void>
  onSell?: (ids: string[]) => Promise<void>
  onGiftSent?: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false),
    [page, setPage] = useState(0),
    [kind, setKind] = useState('all')
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const [concept, setConcept] = useState('all')
  const [query, setQuery] = useState(''),
    [search, setSearch] = useState('')
  useEffect(() => {
    if (query.trim() === search) return
    const timer = setTimeout(() => {
      setSearch(query.trim())
      setPage(0)
      setSelection(new Set())
    }, 250)
    return () => clearTimeout(timer)
  }, [query, search])
  const [retry, setRetry] = useState(0)
  const [data, setData] = useState<CollectibleStorage | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('')
  const [selection, setSelection] = useState<Set<string>>(new Set()),
    [saving, setSaving] = useState(false)
  const [assignIds, setAssignIds] = useState<string[] | null>(null)
  const [sale, setSale] = useState<OwnedCollectible[] | null>(null)
  const cache = useRef(new Map<string, OwnedCollectible>())
  const locked = useRef(false)
  const capacity = state.tankCapacity ?? 50
  const targetId = currentTankId
  const occupancy = (id: string) => state.inhabitants.filter((item) => item.tank_id === id).length
  const free = Math.max(0, capacity - occupancy(targetId))
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError('')
    setData(null)
    void loadCollectibleStorage(page * 50, search, kind, rarity, concept)
      .then((result) => {
        if (active) {
          result.items.forEach((item) => cache.current.set(item.id, item))
          setData(result)
        }
      })
      .catch(() => {
        if (active) setError('보관함을 불러오지 못했어요. 다시 시도해주세요.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, page, kind, rarity, concept, retry, search])
  async function assign() {
    if (!assignIds?.length) return
    if (locked.current || busy || !assignIds.length || assignIds.length > free) return
    locked.current = true
    setSaving(true)
    setError('')
    try {
      await onAssign(assignIds, targetId)
      setAssignIds(null)
      setSelection(new Set())
      setPage(0)
      setRetry((v) => v + 1)
    } catch (cause) {
      setError(storageError(cause))
    } finally {
      locked.current = false
      setSaving(false)
    }
  }
  const groups = groupCollectibles(data?.items ?? []).sort(
    (a, b) => (rarities[a.species.rarity]?.rank ?? 0) - (rarities[b.species.rarity]?.rank ?? 0),
  )
  const selectedItems = [...selection].flatMap((id) =>
    cache.current.get(id) ? [cache.current.get(id)!] : [],
  )
  const selectedGroups = groupCollectibles(selectedItems)
  const sellable = selectedItems.filter(
    (item) =>
      !item.id.startsWith('test-') && item.species.kind !== 'map' && item.species.sell_price > 0,
  )
  const price = sellable.reduce((sum, item) => sum + item.species.sell_price, 0)
  function refreshStorage() {
    setSelection(new Set())
    setPage(0)
    setRetry((v) => v + 1)
  }
  const pageIds = (data?.items ?? []).map((item) => item.id)
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selection.has(id))
  const disabled = busy || saving
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (disabled) return
        setOpen(value)
        if (value) {
          setSelection(new Set())
          setPage(0)
          setRetry((v) => v + 1)
        }
      }}
    >
      <AquariumToolButton
        prominent
        label="보관함"
        icon={<Archive className="size-8" />}
        count={state.storageCount ?? 0}
      />
      <DialogContent className="bottom-0 top-auto left-0 flex h-[88dvh] max-h-[88dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-3 overflow-hidden rounded-t-2xl rounded-b-none pb-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Archive aria-hidden="true" className="size-5 shrink-0 text-primary" />
            보관함{' '}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {state.storageCount ?? 0}개
            </span>
          </DialogTitle>
        </DialogHeader>
        <div
          role="group"
          aria-label="보관함 분류"
          className="segmented-control grid shrink-0 grid-cols-4 gap-1"
        >
          {[
            { id: 'all', name: '전체' },
            { id: 'fish', name: '물고기' },
            { id: 'decoration', name: '장식물' },
            { id: 'trash', name: '쓰레기' },
          ].map((item) => (
            <Button
              key={item.id}
              variant={kind === item.id ? 'secondary' : 'ghost'}
              size="sm"
              className="min-h-16 min-w-0 flex-col gap-1 px-1 py-2 text-[11px]"
              aria-pressed={kind === item.id}
              disabled={disabled}
              onClick={() => {
                setKind(item.id)
                setPage(0)
              }}
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
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <CollectibleSearchInput
            value={query}
            disabled={disabled}
            onChange={(value) => {
              setQuery(value)
              setSelection(new Set())
            }}
          />
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <RegionConceptSelect
            value={concept}
            disabled={disabled}
            onChange={(value) => {
              setConcept(value)
              setPage(0)
              setSelection(new Set())
            }}
          />
          <RaritySelect
            value={rarity}
            disabled={disabled}
            onChange={(value) => {
              setRarity(value)
              setPage(0)
              setSelection(new Set())
            }}
          />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={allSelected}
            disabled={disabled || loading || !pageIds.length}
            onClick={() => setSelection(allSelected ? new Set() : new Set(pageIds.slice(0, 50)))}
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </Button>
          <span className="text-xs text-muted-foreground">
            현재 페이지 · {selection.size}/50개 선택
          </span>
        </div>
        <div className="-mx-4 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {loading ? (
            <p role="status" className="py-10 text-center text-xs text-muted-foreground">
              보관함을 여는 중…
            </p>
          ) : data?.items.length ? (
            <ul className="grid grid-cols-3 border-t border-border/60">
              {groups.map((group) => {
                const value = group.items.filter((item) => selection.has(item.id)).length
                const max = Math.min(group.items.length, Math.max(0, 50 - selection.size + value))
                return (
                  <li key={group.species.id} className="min-w-0">
                    <CollectibleQuantityCard
                      species={group.species}
                      count={group.items.length}
                      value={value}
                      max={max}
                      disabled={disabled}
                      onChange={(quantity) =>
                        setSelection((old) => {
                          const next = new Set(old)
                          group.items.forEach((item) => next.delete(item.id))
                          group.items.slice(0, quantity).forEach((item) => next.add(item.id))
                          return next
                        })
                      }
                    />
                  </li>
                )
              })}
            </ul>
          ) : (
            !error && (
              <EmptyState className="flex-1 px-4 py-8">
                <p className="text-sm">
                  {kind !== 'all' ? '조건에 맞는 개체가 없어요.' : '보관함이 비어 있어요.'}
                </p>
                <p className="mt-1 text-xs">낚시와 선물로 만난 개체가 여기에 모여요.</p>
              </EmptyState>
            )
          )}
        </div>
        {data && data.total > 50 && (
          <div className="flex shrink-0 items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              aria-label="보관함 이전 페이지"
              disabled={disabled || loading || page === 0}
              onClick={() => setPage((v) => v - 1)}
            >
              <ChevronLeft />
            </Button>
            <span className="text-xs tabular-nums">
              {page + 1}/{Math.ceil(data.total / 50)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="보관함 다음 페이지"
              disabled={disabled || loading || (page + 1) * 50 >= data.total}
              onClick={() => setPage((v) => v + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="flex shrink-0 items-center justify-between gap-2 text-xs text-destructive"
          >
            <p>{error}</p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="보관함 새로고침"
              disabled={disabled}
              onClick={() => {
                setSelection(new Set())
                setRetry((v) => v + 1)
              }}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        )}
        {selectedGroups.length > 0 && (
          <div
            className="flex min-h-12 shrink-0 items-center gap-3 overflow-x-auto border-t pt-2"
            aria-label="선택한 개체"
          >
            {selectedGroups.map((group) => (
              <div key={group.species.id} className="relative shrink-0 px-1 pt-3">
                <span className="absolute inset-x-0 top-0 text-center text-[10px] text-primary">
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
        <div className="-mx-4 -mb-4 -mt-3 grid shrink-0 grid-cols-3 border-t pb-[env(safe-area-inset-bottom)]">
          <Button
            variant="secondary"
            aria-label={selection.size + '개 어항에 넣기'}
            className="h-16 min-w-0 rounded-none border-r"
            disabled={disabled || loading || !selection.size || selection.size > free || !targetId}
            onClick={() => {
              setError('')
              setAssignIds([...selection])
            }}
          >
            <Aquarium className="size-9" />
          </Button>
          {selectedGroups.length === 1 ? (
            <SendGiftDialog
              species={selectedGroups[0].species}
              items={selectedGroups[0].items}
              disabled={disabled || loading || selectedGroups[0].species.kind === 'map'}
              onSent={(ids) => {
                onGiftSent?.(ids)
                refreshStorage()
              }}
            />
          ) : (
            <Button
              variant="secondary"
              className="h-16 rounded-none border-r"
              aria-label="선물할 종류 하나를 선택해주세요"
              disabled
            >
              <Gift className="size-9" />
            </Button>
          )}
          <Button
            aria-label={'선택한 개체 판매 ' + price + ' 골드'}
            className="h-16 min-w-0 gap-1.5 rounded-none"
            disabled={disabled || loading || !onSell || !sellable.length}
            onClick={() => {
              setError('')
              setSale([...sellable])
            }}
          >
            <span className="text-xs">판매</span>
            <GoldIcon className="size-8" />
            <span className="text-xs tabular-nums">{price.toLocaleString('ko-KR')}</span>
          </Button>
        </div>
        <ConfirmDialog
          illustration="aquarium"
          open={assignIds !== null}
          onOpenChange={(value) => {
            if (!value) setAssignIds(null)
          }}
          title="어항에 넣을까요?"
          description={`선택한 ${assignIds?.length ?? 0}개를 현재 어항으로 옮겨요.`}
          busy={saving}
          error={error}
          confirmDisabled={busy || !assignIds?.length || (assignIds?.length ?? 0) > free}
          onConfirm={() => void assign()}
        />
        <CollectibleSaleDialog
          items={sale ?? []}
          open={sale !== null}
          onOpenChange={(value) => {
            if (!value) setSale(null)
          }}
          busy={saving}
          error={error}
          disabled={busy || !sale?.length}
          onConfirm={async () => {
            if (locked.current || busy || !onSell || !sale?.length) return
            locked.current = true
            setSaving(true)
            setError('')
            try {
              await onSell(sale.map((item) => item.id))
              setSale(null)
              refreshStorage()
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : '판매하지 못했어요. 다시 시도해주세요.',
              )
            } finally {
              locked.current = false
              setSaving(false)
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
