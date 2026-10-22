import { useRef, useState } from 'react'
import { Flame, PackageCheck, Trash2, TriangleAlert, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  loadProductionMaterials,
  productionError,
  productionSiteKey,
  type ProductionFacility,
  type ProductionMaterial,
  type ProductionBulkAction,
} from './api'
import {
  planProductionStart,
  type BulkAction,
  type BulkStep,
  type PlannedMaterial,
} from './bulk-plan'
import { productionStatus } from './production-status'
import { appArt } from '@/components/app-art'
import { GoldIcon } from '@/features/gold/gold-provider'

const titles = { start: '일괄 가동', claim: '일괄 수령', discard: '일괄 폐기' }
type Review = {
  action: BulkAction
  sites: ProductionFacility[]
  steps: BulkStep[]
  materials: PlannedMaterial[]
  valuable: PlannedMaterial[]
}
export function BulkProductionControls({
  sites,
  now,
  busy,
  error,
  onAction,
}: {
  sites: ProductionFacility[]
  now: number
  busy: boolean
  error: string
  onAction: (args: Omit<ProductionBulkAction, 'p_operation_id'>) => Promise<boolean>
}) {
  const [review, setReview] = useState<Review | null>(null),
    [loading, setLoading] = useState(false),
    [notice, setNotice] = useState(''),
    [accepted, setAccepted] = useState(false)
  const lock = useRef(false)
  const eligible = (action: BulkAction) =>
    sites
      .filter(
        (s) =>
          productionStatus(s, now) ===
            (action === 'start' ? 'idle' : action === 'claim' ? 'ready' : 'expired') &&
          (action !== 'start' || s.enabled),
      )
      .sort((a, b) => a.price - b.price || productionSiteKey(a).localeCompare(productionSiteKey(b)))
  async function prepare(action: BulkAction) {
    if (lock.current || busy) return
    lock.current = true
    setLoading(true)
    setNotice('')
    setAccepted(false)
    const selected = eligible(action)
    try {
      if (!selected.length) return
      let plan = {
        steps: selected.map((s) => ({ facility: productionSiteKey(s), materials: {} }) as BulkStep),
        materials: [] as PlannedMaterial[],
        valuable: [] as PlannedMaterial[],
      }
      if (action === 'start') {
        const stock: Record<string, ProductionMaterial[]> = {}
        for (const site of selected)
          if (!stock[site.kind])
            stock[site.kind] = await loadProductionMaterials(productionSiteKey(site))
        plan = planProductionStart(selected, stock)
      }
      setReview({ action, sites: selected, ...plan })
    } catch (cause) {
      setNotice(productionError(cause))
    } finally {
      lock.current = false
      setLoading(false)
    }
  }
  return (
    <>
      <div className="mb-4 rounded-xl border border-border/70 bg-card/60 p-2">
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { action: 'start', Icon: Flame },
              { action: 'claim', Icon: PackageCheck },
              { action: 'discard', Icon: Trash2 },
            ] as const
          ).map(({ action, Icon }) => (
            <button
              key={action}
              type="button"
              disabled={busy || loading || !eligible(action).length}
              onClick={() => void prepare(action)}
              className="flex min-h-12 items-center justify-center gap-1 rounded-lg px-1 text-[11px] text-primary hover:bg-secondary/70 disabled:opacity-35"
            >
              <Icon className="size-3.5" />
              {titles[action]}
              <span className="tabular-nums">{eligible(action).length}</span>
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <p
          role="status"
          className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <LoaderCircle className="size-3.5 animate-spin" />
          소모할 재료를 확인하고 있어요
        </p>
      )}
      {notice && (
        <p
          role="alert"
          className="mb-3 rounded-xl bg-destructive/5 p-3 text-xs leading-5 text-destructive"
        >
          {notice}
        </p>
      )}
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open && !busy) setReview(null)
        }}
      >
        <DialogContent
          className="max-h-[85dvh] max-w-sm overflow-y-auto rounded-2xl p-5"
          showCloseButton={!busy}
        >
          <DialogTitle className="text-base font-medium">
            {review && titles[review.action]} 확인
          </DialogTitle>
          <DialogDescription className="text-xs leading-5">
            {review?.action === 'start'
              ? '아래 재료를 소모해 대기 중인 생산소를 가동해요.'
              : review?.action === 'claim'
                ? '완성된 연료를 한 번에 수령해요.'
                : '보관시간이 지난 연료를 모두 폐기해요. 폐기 후에는 되돌릴 수 없어요.'}
          </DialogDescription>
          {review && (
            <>
              <section aria-label="대상 생산소" className="rounded-2xl bg-secondary/35 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <p className="text-muted-foreground">
                    생산소{' '}
                    <strong className="ml-1 text-base font-medium tabular-nums text-primary">
                      {review.sites.length}곳
                    </strong>
                  </p>
                  <p className="flex items-center gap-1 text-primary">
                    <appArt.fuel className="size-5" />
                    {review.action === 'discard'
                      ? '만료 연료 폐기'
                      : `${review.sites.reduce((n, s) => n + (review.action === 'start' ? s.output_count : (s.runOutput ?? 0)), 0)}개 ${review.action === 'start' ? '생산' : '수령'}`}
                  </p>
                </div>
                <ul
                  aria-label="대상 생산소 목록"
                  className={`grid max-h-44 gap-2 overflow-y-auto overscroll-contain ${review.sites.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
                >
                  {review.sites.map((site) => (
                    <li
                      key={productionSiteKey(site)}
                      className="flex min-w-0 flex-col items-center rounded-xl bg-background/75 px-2 py-2"
                    >
                      <img
                        src={site.image_path || undefined}
                        alt=""
                        loading="lazy"
                        className="mb-1 size-16 object-contain"
                      />
                      <p className="min-h-7 w-full text-center text-[10px] leading-[14px] text-primary">
                        {site.name}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
              {review.action === 'start' && (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-border/70 p-3">
                  <p className="mb-2 text-xs font-medium">소모 재료 · 판매가 낮은 순</p>
                  {review.materials.map((m) => (
                    <p
                      key={m.id}
                      className="flex justify-between gap-2 py-1 text-[11px] text-muted-foreground"
                    >
                      <span>
                        {m.name}
                        {m.rarity === 'epic' ? ' · 특급' : m.rarity === 'mythic' ? ' · 신화' : ''}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[10px] tabular-nums">
                        <span>{m.quantity}개</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span>개당</span>
                        <GoldIcon className="size-4" />
                        <span>{m.sell_price.toLocaleString('ko-KR')}</span>
                        <span className="sr-only">골드</span>
                      </span>
                    </p>
                  ))}
                </div>
              )}
              {!!review.valuable.length && (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="flex items-center gap-1.5 font-medium">
                    <TriangleAlert className="size-4" />
                    특급·신화 재료가 포함돼요
                  </p>
                  <p className="mt-2 leading-5">
                    {review.valuable.map((m) => `${m.name} ${m.quantity}개`).join(' · ')}
                  </p>
                  <label className="mt-3 flex cursor-pointer items-start gap-2 leading-5">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      className="mt-1 size-4 shrink-0 accent-amber-700"
                    />
                    특급·신화 재료가 소모되는 것을 확인했어요.
                  </label>
                </div>
              )}
              {error && (
                <p role="alert" className="text-xs leading-5 text-destructive">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setReview(null)}
                  className="h-11 rounded-xl"
                >
                  취소
                </Button>
                <Button
                  variant={review.action === 'discard' ? 'destructive' : 'default'}
                  disabled={busy || (!!review.valuable.length && !accepted)}
                  onClick={async () => {
                    if (
                      await onAction({
                        p_action: review.action,
                        p_steps: review.steps,
                        p_allow_valuable: !!review.valuable.length && accepted,
                      })
                    )
                      setReview(null)
                  }}
                  className="h-11 rounded-xl"
                >
                  {busy ? '처리 중…' : titles[review.action]}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
