import { useEffect, useState } from 'react'
import { Minus, Plus, Check, LoaderCircle } from 'lucide-react'
import { appArt } from '@/components/app-art'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { collectibleUrl } from '@/features/collection/api'
import { collectibleCardTones } from '@/features/collection/collectible-card-tones'
import {
  loadProductionMaterials,
  productionError,
  productionSiteKey,
  type ProductionFacility,
  type ProductionMaterial,
} from './api'

function materialTone(rarity: string) {
  return (
    collectibleCardTones[rarity as keyof typeof collectibleCardTones] ?? collectibleCardTones.common
  )
}

function MaterialImage({
  material,
  className,
  kind,
}: {
  material: ProductionMaterial
  className: string
  kind: ProductionFacility['kind']
}) {
  return material.thumbnail_path ? (
    <img
      src={collectibleUrl(material.thumbnail_path)}
      alt=""
      className={`${className} object-contain`}
      loading="lazy"
    />
  ) : kind === 'fish' ? (
    <appArt.fish className={className} />
  ) : (
    <appArt.trash className={className} />
  )
}

export function MaterialDialog({
  facility,
  busy,
  actionError,
  onClose,
  onStart,
  loadMaterials = loadProductionMaterials,
}: {
  facility: ProductionFacility | null
  busy: boolean
  actionError: string
  onClose: () => void
  onStart: (materials: Record<string, number>) => Promise<boolean>
  loadMaterials?: (id: string) => Promise<ProductionMaterial[]>
}) {
  const [materials, setMaterials] = useState<ProductionMaterial[] | null>(null),
    [selected, setSelected] = useState<Record<string, number>>({}),
    [error, setError] = useState('')
  const [request, setRequest] = useState(0)
  useEffect(() => {
    let active = true
    setMaterials(null)
    setSelected({})
    setError('')
    if (facility)
      void loadMaterials(productionSiteKey(facility))
        .then((rows) => {
          if (active) setMaterials(rows)
        })
        .catch((cause) => {
          if (active) setError(productionError(cause))
        })
    return () => {
      active = false
    }
  }, [facility?.id, facility?.siteId, request, loadMaterials])
  const total = Object.values(selected).reduce((a, b) => a + b, 0),
    need = facility?.input_count ?? 0
  function fill() {
    if (!materials) return
    let left = need
    const next: Record<string, number> = {}
    for (const m of [...materials].sort(
      (a, b) => a.sell_price - b.sell_price || a.id.localeCompare(b.id),
    )) {
      const count = Math.min(left, m.available)
      if (count) next[m.id] = count
      left -= count
      if (!left) break
    }
    setSelected(next)
  }
  function change(id: string, next: number) {
    setSelected((previous) => {
      const copy = { ...previous }
      if (next) copy[id] = next
      else delete copy[id]
      return copy
    })
  }
  const chosen = materials?.filter((m) => selected[m.id]) ?? []
  const available = materials?.reduce((sum, m) => sum + m.available, 0) ?? 0
  return (
    <Dialog
      open={!!facility}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] max-w-sm flex-col gap-3 overflow-hidden rounded-2xl p-4 transition-none [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:p-3"
        showCloseButton={!busy}
      >
        <DialogTitle className="shrink-0 pr-7 text-sm font-medium leading-5">
          {facility?.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          보관함의 재료를 골라 생산을 시작해요.
        </DialogDescription>
        {facility && (
          <>
            <div
              className={`shrink-0 rounded-xl border px-3 py-2.5 ${total === need ? 'border-primary/30 bg-secondary/25' : 'border-border/80 bg-card'}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium">
                  재료 넣기
                  {chosen.length > 0 && (
                    <span className="ml-2 text-[10px] font-normal text-muted-foreground [@media(max-height:500px)]:hidden">
                      눌러서 빼기
                    </span>
                  )}
                </p>
                <p
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-[11px] text-muted-foreground"
                >
                  <b className="text-base font-medium tabular-nums text-primary">{total}</b>
                  <span className="ml-1">/ {need}개</span>
                </p>
              </div>
              <div
                role="progressbar"
                aria-label="넣은 재료"
                aria-valuemin={0}
                aria-valuemax={need}
                aria-valuenow={total}
                className="h-1.5 overflow-hidden rounded-full bg-secondary"
              >
                <div
                  className="h-full rounded-full bg-primary/65 transition-[width] duration-200 motion-reduce:transition-none"
                  style={{ width: `${Math.min(100, (total / need) * 100)}%` }}
                />
              </div>
              <div
                className="mt-1 flex h-16 items-center gap-2 overflow-x-auto px-1 pb-1 pt-2 [scrollbar-width:none] [@media(max-height:500px)]:hidden [&::-webkit-scrollbar]:hidden"
                aria-label="선택한 재료"
              >
                {chosen.length ? (
                  chosen.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={busy}
                      onClick={() => change(m.id, Math.max(0, (selected[m.id] ?? 0) - 1))}
                      data-material-rarity={m.rarity}
                      className={`relative grid size-12 shrink-0 place-items-center rounded-lg border border-border/70 bg-background bg-gradient-to-br outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${materialTone(m.rarity)}`}
                      aria-label={`${m.name} 선택한 재료 1개 빼기`}
                      title={`${m.name} ${selected[m.id]}개 · 눌러서 1개 빼기`}
                    >
                      <MaterialImage material={m} kind={facility.kind} className="size-10" />
                      <span
                        aria-hidden="true"
                        className="absolute -right-1 -top-1 rounded-full border border-border bg-background p-0.5 text-muted-foreground"
                      >
                        <Minus className="size-3" />
                      </span>
                      <span className="absolute -bottom-1 -right-1 min-w-6 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-medium tabular-nums text-primary-foreground">
                        ×{selected[m.id]}
                      </span>
                      <span className="sr-only">
                        {m.name} {selected[m.id]}개 선택
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="flex w-full items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    {facility.kind === 'fish' ? (
                      <appArt.fish className="size-6 opacity-40" />
                    ) : (
                      <appArt.trash className="size-6 opacity-40" />
                    )}
                    아래에서 넣을 재료를 골라주세요
                  </p>
                )}
              </div>
              {materials && available < need && (
                <p role="status" className="mt-1 text-[10px] leading-4 text-destructive">
                  보관함 재료가 {need - available}개 부족해요
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium">보관함 재료</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  판매가 낮은 순서로 채워요
                </p>
              </div>
              <button
                type="button"
                disabled={busy || !materials?.length}
                onClick={fill}
                className="min-h-9 shrink-0 rounded-lg border border-primary/20 bg-secondary/60 px-3 text-[11px] font-medium text-primary hover:bg-secondary disabled:opacity-40"
              >
                자동 넣기
              </button>
            </div>
            {error ? (
              <div className="min-h-0 overflow-y-auto py-3 text-center text-xs">
                <p role="alert">{error}</p>
                <button
                  type="button"
                  onClick={() => setRequest((r) => r + 1)}
                  className="mt-2 underline"
                >
                  다시 불러오기
                </button>
              </div>
            ) : !materials ? (
              <p
                role="status"
                className="flex min-h-0 items-center justify-center gap-2 py-4 text-xs text-muted-foreground"
              >
                <LoaderCircle className="size-4 animate-spin" />
                불러오는 중
              </p>
            ) : !materials.length ? (
              <p className="min-h-0 overflow-y-auto rounded-xl bg-secondary/30 p-3 text-center text-xs leading-5 text-muted-foreground">
                사용할 수 있는 재료가 없어요.
                <br />
                어항에 배치하지 않은 보관함 재료만 사용할 수 있어요.
              </p>
            ) : (
              <div
                aria-label="보관함 재료 목록"
                className="min-h-0 max-h-64 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1"
              >
                {materials.map((m) => {
                  const count = selected[m.id] ?? 0
                  return (
                    <div
                      key={m.id}
                      data-material-rarity={m.rarity}
                      className={`flex items-center gap-2 rounded-xl border bg-background bg-gradient-to-br px-2 py-1.5 transition-colors ${materialTone(m.rarity)} ${count ? 'border-primary/40 ring-1 ring-inset ring-primary/15' : 'border-border/60'}`}
                    >
                      <div className="relative shrink-0">
                        <MaterialImage material={m} kind={facility.kind} className="size-10" />
                        {!!count && (
                          <span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary p-0.5 text-primary-foreground">
                            <Check className="size-2.5" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-4">{m.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          보유 {m.available}개 · {m.sell_price}골드
                        </p>
                      </div>
                      <div className="flex items-center">
                        <button
                          type="button"
                          aria-label={`${m.name} 빼기`}
                          disabled={busy || !count}
                          onClick={() => change(m.id, count - 1)}
                          className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background hover:bg-secondary disabled:opacity-25"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span
                          className={`w-8 text-center text-base font-medium tabular-nums ${count ? 'text-primary' : 'text-muted-foreground/50'}`}
                        >
                          {count}
                        </span>
                        <button
                          type="button"
                          aria-label={`${m.name} 넣기`}
                          disabled={busy || count >= m.available || total >= need}
                          onClick={() => change(m.id, count + 1)}
                          className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/20 bg-secondary/60 text-primary hover:bg-secondary disabled:opacity-25"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {actionError && (
              <p
                role="alert"
                className="max-h-16 shrink-0 overflow-y-auto text-xs leading-5 text-destructive"
              >
                {actionError}
              </p>
            )}
            <div className="shrink-0 space-y-2">
              <p className="text-center text-[10px] leading-4 text-muted-foreground">
                가동 후에는 재료를 돌려받을 수 없어요.
              </p>
              <Button
                disabled={busy || total !== need || !materials}
                className="h-11 w-full rounded-xl"
                onClick={async () => {
                  if (await onStart(selected)) onClose()
                }}
              >
                {busy ? '가동 준비 중…' : '재료 넣고 가동하기'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
