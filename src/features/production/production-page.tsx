import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Minus, Plus, LoaderCircle, Store, Info, PackageX } from 'lucide-react'
import { toast } from 'sonner'
import { appArt } from '@/components/app-art'
import { LandscapeImage } from '@/components/landscape-image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { productionDuration } from './facilities'
import { useProduction } from './use-production'
import { productionStatus, remainingTime } from './production-status'
import { MaterialDialog } from './material-dialog'
import type { ProductionFacility } from './api'
import { productionSiteKey } from './api'
import { ProductionShopFilters, filterProductionShop, initialShopFilters } from './shop-filters'
import {
  StatusCircle,
  ProductionProgress,
  productionLabels as labels,
  productionCardColors,
} from './status-sprite'
import { GoldIcon } from '@/features/gold/gold-provider'
import {ProductionAutoClaimNotice} from './production-auto-claim-notice'

const statusFilters = [
  { id: 'all', label: '전체' },
  { id: 'idle', label: '대기 중' },
  { id: 'working', label: '가동 중' },
  { id: 'ready', label: '수령 대기' },
  { id: 'expired', label: '만료' },
] as const
type StatusFilter = (typeof statusFilters)[number]['id']
function matchesStatus(site: ProductionFacility, filter: StatusFilter, now: number) {
  const status = productionStatus(site, now)
  return filter === 'all' || status === filter
}

function Details({ site, compact = false }: { site: ProductionFacility; compact?: boolean }) {
  const MaterialIcon = site.kind === 'trash' ? appArt.trash : appArt.fish
  return (
    <dl
      className={`grid gap-1.5 ${compact ? 'rounded-xl bg-secondary/35 p-2.5 text-[10px]' : 'rounded-xl bg-secondary/35 p-4 text-xs'}`}
    >
      <div className="flex min-h-6 items-center gap-2">
        <dt
          className={`${compact ? 'w-12' : 'w-16'} shrink-0 whitespace-nowrap text-muted-foreground`}
        >
          {compact ? '소모:' : '소모 재료'}
        </dt>
        <dd className="flex items-center gap-1 font-medium tabular-nums">
          <MaterialIcon className={compact ? 'size-5' : 'size-6'} />
          <span className="sr-only">{site.kind === 'trash' ? '쓰레기' : '물고기'} </span>
          {site.input_count}
        </dd>
      </div>
      <div className="flex min-h-6 items-center gap-2">
        <dt
          className={`${compact ? 'w-12' : 'w-16'} shrink-0 whitespace-nowrap text-muted-foreground`}
        >
          {compact ? '생산:' : '생산량'}
        </dt>
        <dd className="flex items-center gap-1 font-medium tabular-nums">
          <appArt.fuel className={compact ? 'size-5' : 'size-6'} />
          <span className="sr-only">연료 </span>
          {site.output_count}
        </dd>
      </div>
      <div className="flex min-h-6 items-center gap-2">
        <dt
          className={`${compact ? 'w-12' : 'w-16'} shrink-0 whitespace-nowrap text-muted-foreground`}
        >
          {compact ? '소요시간:' : '소요 시간'}
        </dt>
        <dd className="tabular-nums">{productionDuration(site.production_minutes)}</dd>
      </div>
      <div className="flex min-h-6 items-center gap-2">
        <dt
          className={`${compact ? 'w-12' : 'w-16'} shrink-0 whitespace-nowrap text-muted-foreground`}
        >
          {compact ? '보관 기간:' : '보관 기간'}
        </dt>
        <dd className="tabular-nums">{productionDuration(site.storage_minutes)}</dd>
      </div>
    </dl>
  )
}

export function ProductionPage({ shop = false }: { shop?: boolean }) {
  const { state, error, busy, now, reload, action, retry } = useProduction()
  const [quantity, setQuantity] = useState(1),
    [shopFilters, setShopFilters] = useState(initialShopFilters)
  const [category, setCategory] = useState<'trash' | 'fish'>('trash'),
    [statusFilter, setStatusFilter] = useState<StatusFilter>('all'),
    [selected, setSelected] = useState<{
      id: string
      mode: 'buy' | 'sell' | 'start' | 'working' | 'info'
    } | null>(null)
  const source = (shop ? state?.facilities : (state?.sites ?? state?.facilities)) ?? []
  const ownedInKind = (kind: 'trash' | 'fish') =>
    state?.sites
      ? state.sites.filter((f) => f.kind === kind).length
      : (state?.facilities ?? [])
          .filter((f) => f.kind === kind)
          .reduce((n, f) => n + (f.ownedCount ?? (f.owned ? 1 : 0)), 0)
  const active = source.find((f) => productionSiteKey(f) === selected?.id) ?? null,
    categoryFacilities = source.filter((f) => (shop ? f.kind === category && f.enabled : f.owned))
  const facilities = shop
    ? filterProductionShop(categoryFacilities, shopFilters)
    : categoryFacilities.filter((f) => matchesStatus(f, statusFilter, now))
  const ownedTotal = ownedInKind('trash') + ownedInKind('fish')
  const activeTotal = state?.activeTotal ?? state?.sites?.filter(s=>productionStatus(s,now)==='working').length ?? 0
  const activeLimit=state?.activeLimit??4
  const purchaseLimit = 100
  async function operate(site: ProductionFacility) {
    const status = productionStatus(site, now)
    if (status === 'idle' && activeTotal >= activeLimit) { toast.error(`연료 생산소는 동시에 ${activeLimit}곳까지 가동할 수 있어요.`); return }
    if (status === 'idle' || status === 'working') {
      setSelected({ id: productionSiteKey(site), mode: status === 'idle' ? 'start' : 'working' })
      return
    }
    if (
      await action({
        p_action: status === 'ready' ? 'claim' : 'discard',
        p_facility: productionSiteKey(site),
      })
    ) {
      toast.success(
        status === 'ready' ? `연료 ${site.runOutput}개를 받았어요.` : '만료된 생산물을 정리했어요.',
      )
      setSelected(null)
    } else void reload()
  }
  const issue = error && (
    <p
      role="alert"
      className="mb-3 rounded-xl bg-destructive/5 p-3 text-xs leading-5 text-destructive"
    >
      {error}
      <button
        type="button"
        disabled={busy}
        onClick={() => void retry()}
        className="ml-2 min-h-9 underline"
      >
        다시 확인
      </button>
    </p>
  )
  return (
    <section
      aria-label={shop ? '연료 생산소 상점' : '연료 생산소'}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="relative z-20 shrink-0 bg-background px-4 pb-2 pt-1">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <appArt.fuel className="size-5" />
            보유 연료{' '}
            <b className="font-medium tabular-nums text-foreground">
              {state?.fuel.toLocaleString('ko-KR') ?? '—'}
            </b>
          </span>
          <Link
            to={shop ? '/production' : '/production-shop'}
            className="flex min-h-9 items-center gap-1 text-primary"
          >
            {shop ? '내 연료 생산소' : '상점 둘러보기'}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {!shop && <p className="mb-2 text-xs text-muted-foreground">연료 생산소 가동 {activeTotal}/{activeLimit}곳 · 보유 수 제한 없음</p>}
        {!shop && state?.autoClaim && <ProductionAutoClaimNotice/>}
        {shop && (
          <div
            role="tablist"
            aria-label="생산소 종류"
            className="grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1"
          >
            {(
              [
                { id: 'trash', label: '쓰레기 재활용', Icon: appArt.trash },
                { id: 'fish', label: '어유 정제', Icon: appArt.fish },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                id={`production-${id}-tab`}
                key={id}
                role="tab"
                type="button"
                aria-selected={category === id}
                aria-controls="production-panel"
                tabIndex={category === id ? 0 : -1}
                onClick={() => {
                  setCategory(id)
                  setStatusFilter('all')
                }}
                onKeyDown={(e) => {
                  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                    e.preventDefault()
                    const next =
                      e.key === 'Home'
                        ? 'trash'
                        : e.key === 'End'
                          ? 'fish'
                          : category === 'trash'
                            ? 'fish'
                            : 'trash'
                    setCategory(next)
                    setStatusFilter('all')
                    document.getElementById(`production-${next}-tab`)?.focus()
                  }
                }}
                className={`flex min-h-12 items-center justify-center gap-1.5 rounded-lg px-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring ${category === id ? 'bg-background font-medium text-primary shadow-sm' : 'text-muted-foreground'}`}
              >
                <Icon className="size-7" />
                {label}
              </button>
            ))}
          </div>
        )}
        {shop && <ProductionShopFilters value={shopFilters} onChange={setShopFilters} />}
        {!shop && (
          <div
            role="tablist"
            aria-label="생산소 상태"
            className="mt-2 grid grid-cols-5 gap-1 rounded-xl bg-secondary/45 p-1"
          >
            {statusFilters.map(({ id, label }, index) => (
              <button
                key={id}
                id={`production-status-${id}-tab`}
                role="tab"
                type="button"
                aria-selected={statusFilter === id}
                aria-controls="production-status-panel"
                tabIndex={statusFilter === id ? 0 : -1}
                onClick={() => setStatusFilter(id)}
                onKeyDown={(e) => {
                  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                    e.preventDefault()
                    const next =
                      e.key === 'Home'
                        ? 0
                        : e.key === 'End'
                          ? statusFilters.length - 1
                          : (index + (e.key === 'ArrowRight' ? 1 : -1) + statusFilters.length) %
                            statusFilters.length
                    setStatusFilter(statusFilters[next].id)
                    document
                      .getElementById(`production-status-${statusFilters[next].id}-tab`)
                      ?.focus()
                  }
                }}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-lg px-0.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusFilter === id ? 'bg-background font-medium text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
              >
                {label}{' '}
                <span className="text-[10px] tabular-nums opacity-65">
                  {id === 'all'
                    ? `${ownedTotal}`
                    : categoryFacilities.filter((f) => matchesStatus(f, id, now)).length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        id="production-panel"
        role={shop ? 'tabpanel' : undefined}
        aria-labelledby={shop ? `production-${category}-tab` : undefined}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {issue}
        {!state && !error ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground"
          >
            <LoaderCircle className="size-4 animate-spin" />
            불러오는 중
          </p>
        ) : (
          state && (
            <>
              {!categoryFacilities.length ? (
                <div className="flex min-h-64 flex-col items-center justify-center py-10 text-center">
                  {shop && category === 'fish' ? (
                    <appArt.fish className="mb-4 size-16" />
                  ) : (
                    <Store className="mb-4 size-10 text-primary/40" />
                  )}
                  <h2 className="text-sm text-primary">
                    {shop ? '새 시설을 준비하고 있어요' : '첫 생산소를 마련해 보세요'}
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    바다에서 모은 자원으로 다음 항해를 준비해요.
                  </p>
                  {!shop && (
                    <Link
                      to="/production-shop"
                      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs text-primary-foreground"
                    >
                      상점 둘러보기
                      <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div
                    id={shop ? undefined : 'production-status-panel'}
                    role={shop ? undefined : 'tabpanel'}
                    aria-labelledby={shop ? undefined : `production-status-${statusFilter}-tab`}
                  >
                    {!facilities.length && (
                      <p role="status" className="py-14 text-center text-xs text-muted-foreground">
                        {shop
                          ? '검색 조건에 맞는 생산소가 없어요.'
                          : statusFilter === 'idle'
                            ? '대기 중인 생산소가 없어요.'
                            : statusFilter === 'working'
                              ? '가동 중인 생산소가 없어요.'
                              : statusFilter === 'ready'
                                ? '수령 대기 중인 생산소가 없어요.'
                                : '만료된 생산소가 없어요.'}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {facilities.map((site) => {
                        const status = productionStatus(site, now)
                        return (
                          <article
                            key={productionSiteKey(site)}
                            aria-label={site.name}
                            data-production-status={shop ? undefined : status}
                            className={`relative overflow-hidden rounded-2xl border transition-colors duration-300 motion-reduce:transition-none ${shop ? 'border-border/80 bg-card' : productionCardColors[status]}`}
                          >
                            <button
                              type="button"
                              disabled={busy}
                              aria-label={`${site.name} · ${shop ? '구매' : labels[status]}`}
                              onClick={() => {
                                if (shop) {
                                  setQuantity(1)
                                  setSelected({ id: site.id, mode: 'buy' })
                                } else void operate(site)
                              }}
                              className="block w-full text-left outline-none hover:bg-secondary/20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60"
                            >
                              <div className="relative aspect-square p-3">
                                <LandscapeImage
                                  src={site.image_path}
                                  alt={site.name}
                                  loading="lazy"
                                  retryable={false}
                                  className="size-full object-contain"
                                />
                                {!shop && status === 'working' && (
                                  <div
                                    data-production-working-overlay
                                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-stone-900/40 px-3 pt-8"
                                  >
                                    <div className="w-full max-w-40 text-center text-white [text-shadow:0_1px_3px_rgb(0_0_0/35%)]">
                                      <p className="text-xs font-medium">가동 중</p>
                                      <p className="mt-1 text-[10px] tabular-nums text-white/90">
                                        {remainingTime(site.completesAt!, now)} 남음
                                      </p>
                                      <ProductionProgress site={site} now={now} />
                                    </div>
                                  </div>
                                )}
                                {!shop && status === 'expired' && (
                                  <div
                                    data-production-expired-overlay
                                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950/65 px-3 pt-8 text-center text-white"
                                  >
                                    <PackageX aria-hidden="true" className="production-expired-overlay-icon size-8 text-amber-200" />
                                    <span className="text-xs font-medium">보관 기간 만료</span>
                                    <span className="text-[10px] text-white/85">눌러서 생산물 폐기</span>
                                  </div>
                                )}
                                {!shop && <StatusCircle site={site} now={now} />}
                              </div>
                              <div className="px-3 pb-3">
                                <h3 className="flex min-h-10 items-center justify-center text-center text-[13px] font-medium leading-5 text-primary">
                                  {site.name}
                                </h3>
                                {shop ? (
                                  <>
                                    <p className="mb-3 line-clamp-2 min-h-8 text-[10px] leading-4 text-muted-foreground">
                                      {site.description}
                                    </p>
                                    <Details site={site} compact />
                                    <div className="mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-secondary/70 text-[11px] font-medium text-primary">
                                      <>
                                        <GoldIcon className="size-5" />
                                        <span className="tabular-nums">
                                          {site.price.toLocaleString('ko-KR')}
                                        </span>
                                        <span className="sr-only">골드</span>
                                        <span>구매</span>
                                      </>
                                    </div>
                                    {(site.ownedCount ?? (site.owned ? 1 : 0)) > 0 && (
                                      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                                        보유 {site.ownedCount ?? 1}곳
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <div className="border-t border-border/60 pt-2.5 text-center">
                                    <p
                                      className={`text-[11px] ${status === 'ready' ? 'text-emerald-700' : status === 'expired' ? 'text-rose-500' : 'text-muted-foreground'}`}
                                    >
                                      {status === 'ready'
                                        ? '수령 대기 중…'
                                        : status === 'expired'
                                          ? '생산물이 만료됐어요'
                                          : labels[status]}
                                    </p>
                                    <p className="mt-1 min-h-5 text-[10px] tabular-nums text-muted-foreground">
                                      {status === 'working' || status === 'ready' ? (
                                        <span className="inline-flex items-center justify-center gap-1">
                                          <appArt.fuel className="size-4" />
                                          <span className="sr-only">연료 </span>
                                          <span>
                                            {site.runOutput}개를{' '}
                                            {status === 'working' ? '생산 중…' : '수령하세요'}
                                          </span>
                                        </span>
                                      ) : status === 'expired' ? (
                                        '눌러서 폐기해 주세요'
                                      ) : (
                                        <span
                                          className="inline-flex items-center justify-center gap-1.5"
                                          aria-label={`${site.kind === 'trash' ? '쓰레기' : '물고기'} 재료 0/${site.input_count}`}
                                        >
                                          {site.kind === 'trash' ? (
                                            <appArt.trash className="size-5" />
                                          ) : (
                                            <appArt.fish className="size-5" />
                                          )}
                                          <span>0/{site.input_count}</span>
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              aria-label={`${site.name} 정보`}
                              onClick={() =>
                                setSelected({ id: productionSiteKey(site), mode: 'info' })
                              }
                              className="absolute left-1 top-1 z-10 grid size-11 place-items-center rounded-full text-primary/70 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                            >
                              <span className="grid size-7 place-items-center rounded-full border border-border/70 bg-background/95 shadow-sm">
                                <Info className="size-4" />
                              </span>
                            </button>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )
        )}
      </div>
      <MaterialDialog
        facility={selected?.mode === 'start' ? active : null}
        busy={busy}
        actionError={error}
        onClose={() => setSelected(null)}
        onStart={(materials) =>
          action({
            p_action: 'start',
            p_facility: productionSiteKey(active!),
            p_materials: materials,
          })
        }
      />
      <Dialog
        open={!!active && selected?.mode !== 'start'}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null)
        }}
      >
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto rounded-2xl p-4"
          showCloseButton={!busy}
        >
          <DialogTitle className="pr-5 text-base font-medium">{active?.name}</DialogTitle>
          <DialogDescription className="text-xs">{active?.description}</DialogDescription>
          {active && (
            <>
              <img src={active.image_path} alt="" className="mx-auto size-32 object-contain" />
              {selected?.mode === 'working' ? (
                <div className="rounded-xl bg-secondary/40 p-4 text-center">
                  <p className="text-sm text-primary">{labels[productionStatus(active, now)]}</p>
                  <p className="mt-2 text-xs tabular-nums">
                    {productionStatus(active, now) === 'working'
                      ? remainingTime(active.completesAt!, now) + ' 후 완료'
                      : productionStatus(active, now) === 'ready'
                        ? `연료 ${active.runOutput}개를 받을 수 있어요.`
                        : '보관 기간이 지났어요.'}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    완료 후 {productionDuration(active.storage_minutes)} 안에 수령해 주세요.
                  </p>
                </div>
              ) : (
                <Details site={active} />
              )}
              {issue}
              {selected?.mode === 'sell' ? (
                <>
                  <p className="text-xs leading-6 text-muted-foreground">
                    이 생산소를 상점 구매가의 50%인{' '}
                    {Math.floor(active.price / 2).toLocaleString('ko-KR')}골드에 판매할까요?
                    판매하면 보유 목록에서 사라져요.
                  </p>
                  <Button
                    disabled={busy}
                    variant="destructive"
                    onClick={async () => {
                      if (
                        await action({ p_action: 'sell', p_facility: productionSiteKey(active) })
                      ) {
                        setSelected(null)
                      }
                    }}
                  >
                    판매 확정
                  </Button>
                </>
              ) : selected?.mode === 'buy' ? (
                <>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary/35 p-3">
                    <div>
                      <label htmlFor="production-purchase-quantity" className="text-xs font-medium">
                        구매 수량
                      </label>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        전체 보유 {ownedTotal}곳 · 보유 수 제한 없음
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="구매 수량 줄이기"
                        disabled={busy || quantity <= 1}
                        onClick={() => setQuantity((n) => n - 1)}
                        className="grid size-9 place-items-center rounded-lg border border-border bg-background disabled:opacity-30"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        id="production-purchase-quantity"
                        aria-label="구매 수량"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={Math.max(1, purchaseLimit)}
                        step={1}
                        disabled={busy}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(
                            Math.min(
                              Math.max(1, purchaseLimit),
                              Math.max(1, Math.floor(Number(e.target.value) || 1)),
                            ),
                          )
                        }
                        className="h-9 w-12 rounded-lg bg-transparent text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <button
                        type="button"
                        aria-label="구매 수량 늘리기"
                        disabled={busy || quantity >= purchaseLimit}
                        onClick={() => setQuantity((n) => n + 1)}
                        className="grid size-9 place-items-center rounded-lg border border-border bg-background disabled:opacity-30"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <Button
                    className="mt-2 h-11 rounded-xl"
                    aria-label={
                      busy
                        ? '구매 중…'
                        : quantity > purchaseLimit
                          ? '한 번에 100곳까지 구매할 수 있어요'
                          : state!.gold < active.price * quantity
                            ? '골드가 부족해요'
                            : `${(active.price * quantity).toLocaleString('ko-KR')}골드로 구매하기`
                    }
                    disabled={
                      busy || quantity > purchaseLimit || state!.gold < active.price * quantity
                    }
                    onClick={async () => {
                      if (
                        await action({
                          p_action: 'buy',
                          p_facility: active.id,
                          p_quantity: quantity,
                        })
                      ) {
                        setSelected(null)
                      }
                    }}
                  >
                    {busy ? (
                      '구매 중…'
                    ) : quantity > purchaseLimit ? (
                      '한 번에 100곳까지 구매할 수 있어요'
                    ) : state!.gold < active.price * quantity ? (
                      '골드가 부족해요'
                    ) : (
                      <>
                        <GoldIcon className="size-5" />
                        <span className="tabular-nums">
                          {(active.price * quantity).toLocaleString('ko-KR')}
                        </span>
                        구매하기
                      </>
                    )}
                  </Button>
                </>
              ) : (
                selected?.mode !== 'info' &&
                productionStatus(active, now) !== 'working' && (
                  <Button
                    disabled={busy}
                    onClick={() => void operate(active)}
                    className="h-11 rounded-xl"
                  >
                    {productionStatus(active, now) === 'ready' ? '연료 받기' : '만료된 생산물 정리'}
                  </Button>
                )
              )}
              {!shop && selected?.mode === 'info' && (
                <Button
                  variant="outline"
                  disabled={busy || active.startedAt !== null}
                  onClick={() => setSelected({ id: productionSiteKey(active), mode: 'sell' })}
                >
                  {active.startedAt !== null ? (
                    '생산물을 수령·정리한 뒤 판매할 수 있어요'
                  ) : (
                    <>
                      판매{' '}
                      <span className="tabular-nums">
                        {Math.floor(active.price / 2).toLocaleString('ko-KR')}
                      </span>
                      <GoldIcon className="size-5" />
                      <span className="sr-only">골드</span>
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
