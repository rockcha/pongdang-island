import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fishingDockButton } from '@/components/fishing-dock-style'
import { appArt } from '@/components/app-art'
import { RaritySelect } from '@/components/rarity-select'
import { RegionConceptSelect, matchesRegionConcept } from '@/components/region-concept-select'
import type { RarityFilter } from '@/components/rarity-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { CollectibleSaleDialog } from '@/features/aquarium/collectible-sale-dialog'
import { CollectibleQuantityCard } from '@/features/aquarium/collectible-quantity-card'
import { groupCollectibles } from '@/features/aquarium/collectible-groups'
import type { OwnedCollectible } from '@/features/collection/api'
import type { FishingAttempt } from './api'
import { loadTripStorage } from './fishing-trip-storage'

const { storage: PackageOpen } = appArt

export function FishingTripDialog({
  catches,
  disabled,
  dock = false,
  onSold,
}: {
  catches: FishingAttempt[]
  disabled: boolean
  dock?: boolean
  onSold: (ids: string[]) => void
}) {
  const gold = useGold()
  const [open, setOpen] = useState(false)
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const [concept, setConcept] = useState('all')
  const [items, setItems] = useState<OwnedCollectible[]>([])
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false),
    [error, setError] = useState('')
  const [sale, setSale] = useState<OwnedCollectible[] | null>(null)
  const [selling, setSelling] = useState(false),
    [retry, setRetry] = useState(0)
  const locked = useRef(false)
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError('')
    setSelection(new Set())
    void loadTripStorage(catches, () => active)
      .then((next) => {
        if (active) setItems(next)
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
  }, [open, catches, retry])
  const visible = items.filter(
    (item) =>
      (rarity === 'all' || item.species.rarity === rarity) &&
      matchesRegionConcept(item.species, concept),
  )
  const selected = items.filter((item) => selection.has(item.id))
  const total = selected.reduce((sum, item) => sum + item.species.sell_price, 0)
  const allSelected =
    visible.length > 0 && visible.slice(0, 100).every((item) => selection.has(item.id))
  const busy = selling || gold.busy || gold.loading
  function selectGroup(group: OwnedCollectible[], count: number) {
    setSelection((previous) => {
      const next = new Set(previous)
      group.forEach((item) => next.delete(item.id))
      group
        .slice(0, Math.max(0, Math.min(count, 100 - next.size)))
        .forEach((item) => next.add(item.id))
      return next
    })
  }
  async function sell() {
    if (locked.current || busy || !sale?.length) return
    locked.current = true
    setSelling(true)
    setError('')
    try {
      const ids = sale.map((item) => item.id)
      await gold.transact({ type: 'sell', id: `collectibles:${[...ids].sort().join(',')}` })
      setItems((previous) => previous.filter((item) => !ids.includes(item.id)))
      setSelection(new Set())
      setSale(null)
      onSold(ids)
      window.dispatchEvent(new Event('collectibles-changed'))
      toast.success(`${ids.length}개를 판매했어요.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '판매하지 못했어요. 다시 시도해주세요.')
    } finally {
      locked.current = false
      setSelling(false)
    }
  }
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!selling && !sale) setOpen(value)
        }}
      >
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              disabled={disabled}
              aria-label={`보관함 · ${catches.length}개`}
              className={
                dock
                  ? fishingDockButton
                  : 'relative h-14 min-w-20 flex-row gap-2 rounded-none border border-white/25 bg-slate-950/25 px-2 text-white backdrop-blur-md hover:bg-slate-950/40 hover:text-white'
              }
            />
          }
        >
          <PackageOpen className="size-6" />
          <span className="text-[11px] tabular-nums">
            {dock && '보관함 · '}
            {catches.length}
          </span>
        </DialogTrigger>
        <DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[85dvh] max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl rounded-b-none sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="/branding/pongi-starfish.png" alt="" className="size-6 object-contain" />
              보관함
            </DialogTitle>
            <DialogDescription>이번 낚시에서 잡은 개체를 선택해 바로 판매해요.</DialogDescription>
          </DialogHeader>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || loading || !visible.length}
              onClick={() => {
                setSelection(
                  allSelected ? new Set() : new Set(visible.slice(0, 100).map((item) => item.id)),
                )
              }}
            >
              {allSelected ? '선택 해제' : '전체 선택'}
            </Button>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <RegionConceptSelect
              value={concept}
              disabled={busy}
              onChange={(value) => {
                setConcept(value)
                setSelection(new Set())
              }}
            />
            <RaritySelect
              disabled={busy}
              value={rarity}
              onChange={(value) => {
                setRarity(value)
                setSelection(new Set())
              }}
            />
          </div>
          {loading ? (
            <p role="status" className="py-10 text-center text-xs text-muted-foreground">
              보관함을 확인하고 있어요…
            </p>
          ) : error && !sale ? (
            <div role="alert" className="space-y-3 py-6 text-center text-xs">
              <p>{error}</p>
              <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
                다시 불러오기
              </Button>
            </div>
          ) : visible.length ? (
            <div className="-mx-4 min-h-0 overflow-y-auto overscroll-contain">
              <div className="grid grid-cols-3 border-t border-border/60">
                {groupCollectibles(visible).map((group) => (
                  <CollectibleQuantityCard
                    key={group.species.id}
                    species={group.species}
                    count={group.items.length}
                    value={group.items.filter((item) => selection.has(item.id)).length}
                    disabled={busy}
                    max={Math.min(
                      group.items.length,
                      100 -
                        selected.length +
                        group.items.filter((item) => selection.has(item.id)).length,
                    )}
                    onChange={(count) => selectGroup(group.items, count)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {rarity === 'all' ? '판매할 수 있는 개체가 없어요.' : '해당 등급의 개체가 없어요.'}
            </p>
          )}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 pt-3">
            <div>
              <p className="text-[10px] text-muted-foreground">
                {selected.length}개 선택 · 최대 100개
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-lg tabular-nums text-primary">
                <GoldIcon className="size-5" />
                {total.toLocaleString('ko-KR')}
              </p>
            </div>
            <Button
              disabled={!selected.length || busy || loading}
              onClick={() => {
                setError('')
                setSale(selected)
              }}
            >
              선택 판매
            </Button>
          </div>
          <CollectibleSaleDialog
            open={!!sale}
            onOpenChange={(value) => {
              if (!value && !selling) {
                setSale(null)
                setError('')
              }
            }}
            items={sale ?? []}
            busy={selling}
            disabled={busy}
            error={error}
            onConfirm={() => void sell()}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
