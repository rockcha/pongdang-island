import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {Species} from '@/features/collection/api'
import {RarityBadge} from '@/components/rarity-badge'
import { useDailyOrderSpecies } from '@/features/merchant/use-daily-order-species'
import { EmptyState } from '@/components/empty-state'
import { appArt } from '@/components/app-art'
import { CollectibleSearchInput } from './collectible-search-input'
import { RaritySelect } from '@/components/rarity-select'
import { RegionConceptSelect, matchesRegionConcept } from '@/components/region-concept-select'
import type { RarityFilter } from '@/components/rarity-select'
import { useEffect, useRef, useState } from 'react'
import { groupCollectibles,compareStoredSpecies } from './collectible-groups'
import { CollectibleQuantityCard } from './collectible-quantity-card'
import { ChevronLeft, ChevronRight, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { GoldIcon } from '@/features/gold/gold-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CollectibleSaleDialog } from './collectible-sale-dialog'
import { SendGiftDialog } from '@/features/gifts/send-gift-dialog'
import type { OwnedCollectible } from '@/features/collection/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AquariumToolButton } from './aquarium-tool-button'
import { loadCollectibleStorage, storageError } from './api'
import type { AquariumState, CollectibleStorage } from './api'
import {AquariumSearchToggle,AquariumSelectionMenu} from './aquarium-panel-controls'

const { storage: Archive, aquarium: Aquarium } = appArt

export function CollectibleStorageDialog({
  state,
  currentTankId,
  busy,
  onAssign,
  onSell,
  onGiftSent,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  recentItems,
  page: pageMode = false,
}: {
  state: AquariumState
  currentTankId: string
  busy: boolean
  onAssign?: (ids: string[], tankId: string) => Promise<void>
  onSell?: (ids: string[]) => Promise<void>
  onGiftSent?: (ids: string[]) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  recentItems?: OwnedCollectible[]
  page?: boolean
}) {
  const recipientId=new URLSearchParams(window.location.search).get('giftTo')??undefined
  const [detail,setDetail]=useState<Species|null>(null)
  const [internalOpen, setInternalOpen] = useState(false),
    [page, setPage] = useState(0),
    [kind, setKind] = useState('all')
  const open = pageMode || (controlledOpen ?? internalOpen)
  const setOpen = (value: boolean) => { setInternalOpen(value); onOpenChange?.(value) }
  const [recentOnly, setRecentOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchOpen,setSearchOpen]=useState(false)
  const recentIds = new Set(recentItems?.map(item => item.id) ?? [])
  const dailyOrderSpecies = useDailyOrderSpecies(open)
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
  const [saleError, setSaleError] = useState('')
  const cache = useRef(new Map<string, OwnedCollectible>())
  const locked = useRef(false)
  const [selectingAll, setSelectingAll] = useState(false)
  const selectionRequest = useRef(0)
  const [saleProgress, setSaleProgress] = useState('')
  useEffect(() => () => { selectionRequest.current++ }, [])
  const capacity = state.tanks.find(tank=>tank.id===currentTankId)?.capacity ?? state.tankCapacity ?? 50
  const targetId = currentTankId
  const occupancy = (id: string) => state.inhabitants.filter((item) => item.tank_id === id).length
  const free = Math.max(0, capacity - occupancy(targetId))
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError('')
    setData(null)
    const filteredRecent = (recentItems ?? []).filter(item =>
      (kind === 'all' || item.species.kind === kind) &&
      (rarity === 'all' || item.species.rarity === rarity) &&
      matchesRegionConcept(item.species, concept) &&
      (!search || item.species.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
    ).sort((a,b)=>compareStoredSpecies(a.species,b.species)||a.id.localeCompare(b.id))
    void (recentOnly
      ? Promise.resolve({ items: filteredRecent.slice(page * 50, (page + 1) * 50), total: filteredRecent.length, pageSize: 50 })
      : loadCollectibleStorage(page * 50, search, kind, rarity, concept))
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
  }, [open, page, kind, rarity, concept, retry, search, recentOnly, recentItems])
  async function assign() {
    if (!assignIds?.length || !onAssign) return
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
  const groups = [
    ...groupCollectibles((data?.items ?? []).filter(item => recentIds.has(item.id))).map(group => ({ ...group, recent: true })),
    ...groupCollectibles((data?.items ?? []).filter(item => !recentIds.has(item.id))).map(group => ({ ...group, recent: false })),
  ].sort((a, b) => compareStoredSpecies(a.species,b.species)||Number(b.recent)-Number(a.recent))
  const selectedItems = [...selection].flatMap((id) =>
    cache.current.get(id) ? [cache.current.get(id)!] : [],
  )
  const selectedGroups = groupCollectibles(selectedItems)
  const sellable = selectedItems.filter(
    (item) =>
      !item.id.startsWith('test-') && (item.species.kind!=='map'&&item.species.kind!=='relic') && item.species.sell_price > 0,
  )
  const price = sellable.reduce((sum, item) => sum + item.species.sell_price, 0)
  function refreshStorage() {
    setSelection(new Set())
    setPage(0)
    setRetry((v) => v + 1)
  }
  const pageIds = (data?.items ?? []).map((item) => item.id)
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selection.has(id))
  const allPagesSelected = Boolean(data?.total && selection.size === data.total)
  const searchPending = query.trim() !== search
  const disabled = busy || saving || selectingAll
  async function selectAllPages() {
    if (disabled || loading || searchPending || !data?.total) return
    if (allPagesSelected) { setSelection(new Set()); return }
    const request = ++selectionRequest.current
    setSelectingAll(true)
    setError('')
    try {
      const fetched = new Map<string, OwnedCollectible>()
      if (recentOnly) {
        for (const item of recentItems ?? []) {
          if ((kind === 'all' || item.species.kind === kind) && (rarity === 'all' || item.species.rarity === rarity) && matchesRegionConcept(item.species, concept) && (!search || item.species.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))) fetched.set(item.id, item)
        }
      } else {
        const total = data.total
        for (let offset = 0; offset < total; offset += 50) {
          const result = await loadCollectibleStorage(offset, search, kind, rarity, concept)
          if (request !== selectionRequest.current) return
          if (result.total !== total || !result.items.length) throw new Error('STORAGE_CHANGED')
          for (const item of result.items) fetched.set(item.id, item)
        }
        if (fetched.size !== total) throw new Error('STORAGE_CHANGED')
      }
      if (request !== selectionRequest.current) return
      for (const [id, item] of fetched) cache.current.set(id, item)
      setSelection(new Set(fetched.keys()))
    } catch {
      if (request === selectionRequest.current) setError('전체 목록을 선택하지 못했어요. 목록이 바뀌었거나 연결이 불안정해요. 다시 시도해주세요.')
    } finally {
      if (request === selectionRequest.current) setSelectingAll(false)
    }
  }
  const Content = pageMode ? 'div' : DialogContent
  return (
    <Dialog
      open={!pageMode && open}
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
      {!hideTrigger && !pageMode && <AquariumToolButton
        prominent
        label="보관함"
        icon={<Archive className="size-8" />}
        count={state.storageCount ?? 0}
      />}
      <Content data-storage-page={pageMode} className={pageMode ? 'aquarium-storage-panel relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 pt-3 pb-4' : 'aquarium-storage-panel aquarium-work-panel aquarium-item-panel bottom-0 top-auto left-0 flex h-[96dvh] max-h-[96dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-2 overflow-hidden rounded-t-2xl rounded-b-none pb-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl'}>
        {!pageMode && <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Archive aria-hidden="true" className="size-5 shrink-0 text-primary" />
            보관함{' '}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {state.storageCount ?? 0}개
            </span>
          </DialogTitle>
          <AquariumSearchToggle open={searchOpen} onChange={setSearchOpen} active={!!query}/>
        </DialogHeader>}
        {recentItems !== undefined && <div role="group" aria-label="이번 낚시 구분" className="flex shrink-0 gap-1 rounded-xl bg-secondary/40 p-1">
          {[false, true].map(value => <Button key={String(value)} variant={recentOnly === value ? 'secondary' : 'ghost'} size="sm" className="flex-1 rounded-lg text-xs" aria-pressed={recentOnly === value} disabled={disabled} onClick={() => { setRecentOnly(value); setPage(0); setSelection(new Set()) }}>{value ? `이번 낚시 · ${recentItems.length}` : '전체 보관함'}</Button>)}
        </div>}
        <div
          role="group"
          aria-label="보관함 분류"
          className="aquarium-panel-categories segmented-control grid shrink-0 grid-cols-4 gap-1 p-1"
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
              className="min-h-11 min-w-0 px-1 text-xs"
              aria-pressed={kind === item.id}
              disabled={disabled}
              onClick={() => {
                setKind(item.id)
                setSelection(new Set())
                setPage(0)
              }}
            >
              <span>{item.name}</span>
            </Button>
          ))}
        </div>
        <div className="aquarium-panel-search flex min-w-0 shrink-0 items-center gap-2" data-expanded={searchOpen}>
          <CollectibleSearchInput
            value={query}
            disabled={disabled}
            onChange={(value) => {
              setQuery(value)
              setSelection(new Set())
            }}
          />
          <Button variant="outline" className="aquarium-filter-toggle min-h-11 shrink-0 gap-1 text-xs" aria-label="필터" aria-expanded={filtersOpen} data-active={concept!=='all'||rarity!=='all'} onClick={() => setFiltersOpen(value => !value)}><SlidersHorizontal className="size-4" /><span>필터{(concept !== "all" || rarity !== "all") && ` (${Number(concept !== "all") + Number(rarity !== "all")})`}</span></Button>
        </div>
        <div hidden={!filtersOpen} className={filtersOpen ? "flex min-w-0 shrink-0 items-center gap-2" : "hidden"}>
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
        <div className="aquarium-panel-selection flex shrink-0 flex-wrap items-center justify-between gap-1">
          <AquariumSelectionMenu>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={allSelected}
            disabled={disabled || loading || searchPending || !pageIds.length}
            onClick={() => setSelection(current => {
              const next = new Set(current)
              for (const id of pageIds) { if (allSelected) next.delete(id); else next.add(id) }
              return next
            })}
          >
            {allSelected ? '이 페이지 해제' : '이 페이지 선택'}
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" aria-pressed={allPagesSelected} disabled={disabled || loading || searchPending || !data?.total} onClick={() => void selectAllPages()}>{selectingAll ? '선택 중…' : allPagesSelected ? '전체 해제' : '모든 페이지 선택'}</Button>
          </AquariumSelectionMenu>
          <span className="text-[11px] text-muted-foreground" role="status">
            {selection.size}개 선택
          </span>
          {data && data.total > 50 && (
            <div className="aquarium-panel-pagination flex shrink-0 items-center justify-center gap-4">
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

        </div>
        <div className="-mx-4 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {loading ? (
            <p role="status" className="py-10 text-center text-xs text-muted-foreground">
              보관함을 여는 중…
            </p>
          ) : data?.items.length ? (
            <ul className="aquarium-panel-grid grid grid-cols-3 border-t border-border/60">
              {groups.map((group) => {
                const value = group.items.filter((item) => selection.has(item.id)).length
                const max = group.items.length
                return (
                  <li key={group.species.id + ':' + group.recent} className="min-w-0">
                    <CollectibleQuantityCard
                      species={group.species}
                      onDetail={()=>setDetail(group.species)}
                      recent={group.recent}
                      dailyOrder={dailyOrderSpecies.has(group.species.id)}
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
        {selection.size > 0 && <div className={`aquarium-panel-actions -mx-4 -mb-4 grid shrink-0 ${pageMode ? 'grid-cols-2' : 'grid-cols-3'} border-t pb-[env(safe-area-inset-bottom)]`}>
          {!pageMode && <Button
            variant="secondary"
            aria-label={selection.size + '개 어항에 넣기'}
            className="h-16 min-w-0 rounded-none border-r"
            disabled={disabled || loading || !selection.size || selection.size > free || !targetId}
            onClick={() => {
              setError('')
              setAssignIds([...selection])
            }}
          >
            <Aquarium className="size-5" /><span className="text-xs">어항에 넣기</span>
          </Button>}
          {selectedGroups.length>0&&<SendGiftDialog species={selectedGroups[0].species} items={selectedItems} recipientId={recipientId} disabled={disabled||loading||selectedItems.some(i=>['map','relic'].includes(i.species.kind))} onSent={ids=>{onGiftSent?.(ids);refreshStorage()}}/>}

          <Button
            aria-label={'선택한 개체 판매 ' + price + ' 골드'}
            className="h-16 min-w-0 gap-1.5 rounded-none"
            disabled={disabled || loading || !onSell || !sellable.length}
            onClick={() => {
              setError('')
              setSale([...sellable])
              setSaleError('')
            }}
          >
            <span className="text-xs">판매</span>
            <GoldIcon className="size-8" />
            <span className="text-xs tabular-nums">{price.toLocaleString('ko-KR')}</span>
          </Button>
        </div>}
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
        <Dialog open={!!detail} onOpenChange={v=>{if(!v)setDetail(null)}}><DialogContent className="aquarium-work-panel max-h-[85dvh] overflow-y-auto sm:max-w-sm"><DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>{detail&&<><CollectibleThumbnail species={detail} path={detail.thumbnail_path} name={detail.name} className="mx-auto size-36"/><RarityBadge rarity={detail.rarity}/><p className="whitespace-pre-wrap text-sm leading-7">{detail.description}</p><p className="text-xs text-muted-foreground">판매가 {(detail.sell_price??0).toLocaleString()} 골드</p></>}</DialogContent></Dialog>
        <CollectibleSaleDialog
          allowBatch
          items={sale ?? []}
          open={sale !== null}
          onOpenChange={(value) => {
            if (!value) setSale(null)
          }}
          busy={saving}
          error={saleError}
          disabled={busy || !sale?.length}
          onConfirm={async () => {
            if (locked.current || busy || !onSell || !sale?.length) return
            locked.current = true
            setSaving(true)
            setSaleError('')
            let completed = 0
            try {
              for (let start = 0; start < sale.length; start += 100) {
                setSaleProgress(`${completed}/${sale.length}개 판매 중…`)
                const batch = sale.slice(start, start + 100)
                await onSell(batch.map(item => item.id))
                completed += batch.length
                const sold = new Set(batch.map(item => item.id))
                setSelection(current => new Set([...current].filter(id => !sold.has(id))))
              }
              setSale(null)
              refreshStorage()
            } catch (cause) {
              setSale(sale.slice(completed))
              if (completed > 0) { setPage(0); setRetry(value => value + 1) }
              setSaleError(
                `${completed > 0 ? `${completed}개는 판매했어요. 나머지는 선택을 유지했어요. ` : ''}${cause instanceof Error ? cause.message : '판매하지 못했어요. 다시 시도해주세요.'}`,
              )
            } finally {
              locked.current = false
              setSaving(false)
              setSaleProgress('')
            }
          }}
        >
          {saleProgress && <p role="status" className="text-center text-xs text-primary">{saleProgress}</p>}
        </CollectibleSaleDialog>
      </Content>
    </Dialog>
  )
}
