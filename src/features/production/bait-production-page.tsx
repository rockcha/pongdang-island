import {playPurchaseSound,playSaleSound} from '@/features/gold/purchase-sound'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Info, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { appArt } from '@/components/app-art'
import { LandscapeImage } from '@/components/landscape-image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { GoldIcon } from '@/features/gold/gold-provider'
import { productionDuration } from './facilities'
import { baitProductionArt } from './bait-production-art'
import {ProductionStatusSprite,ProductionProgress} from './status-sprite'
import { remainingTime } from './production-status'
import {BaitProductionShopFilters,filterBaitProductionShop,initialBaitShopFilters} from './bait-shop-filters'
import {
  loadBaitProduction,
  actBaitProduction,
  baitProductionError,
  type BaitFacility,
  type BaitProductionState,
  type BaitProductionAction,
} from './bait-production-api'

function status(s: BaitFacility, now: number) {
  return !s.startedAt
    ? 'idle'
    : now >= Date.parse(s.expiresAt!)
      ? 'expired'
      : now >= Date.parse(s.completesAt!)
        ? 'ready'
        : 'working'
}
const labels = {
  all: '전체',
  idle: '대기 중',
  working: '가동 중',
  ready: '수령 대기',
  expired: '만료',
}
function Details({ site }: { site: BaitFacility }) {
  return (
    <dl className="space-y-2 rounded-xl bg-secondary/35 p-3 text-xs">
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">소모</dt>
        <dd className="flex items-center gap-1">
          <appArt.fuel className="size-5" />
          <span className="sr-only">연료 </span>
          {site.fuel_cost}개
        </dd>
      </div>
      <div className="flex items-center justify-between gap-2">
        <dt className="shrink-0 text-muted-foreground">생산</dt>
        <dd className="flex items-center gap-1" title={site.baitName}>
          <img src={site.image_path} alt={site.baitName} loading="lazy" className="size-5 shrink-0 object-contain" />
          {site.output_count}개
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">생산 시간</dt>
        <dd>{productionDuration(site.production_minutes)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">보관 대기</dt>
        <dd>{productionDuration(site.storage_minutes)}</dd>
      </div>
    </dl>
  )
}
export function BaitProductionPage({ shop = false }: { shop?: boolean }) {
  const [state, setState] = useState<BaitProductionState | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now()),
    [filter, setFilter] = useState<keyof typeof labels>('all'),
    [shopFilters, setShopFilters] = useState(initialBaitShopFilters),
    [selected, setSelected] = useState<BaitFacility | null>(null),
    [quantity, setQuantity] = useState(1)
  const [selling,setSelling]=useState(false)
  useEffect(()=>setSelling(false),[selected?.siteId,selected?.id])
  const offset = useRef(0),
    alive = useRef(true),
    lock = useRef(false),
    pending = useRef<BaitProductionAction | null>(null),
    request = useRef(0)
  const apply = useCallback((s: BaitProductionState) => {
    if (!alive.current) return
    offset.current = Date.parse(s.serverNow) - Date.now()
    setNow(Date.now() + offset.current)
    setState(s)
  }, [])
  const reload = useCallback(async () => {
    const version = ++request.current
    try {
      const s = await loadBaitProduction()
      if (version === request.current && !lock.current) {
        apply(s)
        if (!pending.current) setError('')
      }
    } catch (e) {
      if (alive.current) setError(baitProductionError(e))
    }
  }, [apply])
  useEffect(() => {
    alive.current = true
    void reload()
    const sync = () => {
        if (!document.hidden) void reload()
      },
      timer = setInterval(() => {
        if (!document.hidden) setNow(Date.now() + offset.current)
      }, 1000)
    window.addEventListener('focus', sync)
    const refresh = setInterval(sync, 15000)
    window.addEventListener('online', sync)
    window.addEventListener('bait-production-changed', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      alive.current = false
      clearInterval(timer)
      clearInterval(refresh)
      window.removeEventListener('focus', sync)
      window.removeEventListener('online', sync)
      window.removeEventListener('bait-production-changed', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [reload])
  async function mutate(args: Omit<BaitProductionAction, 'p_operation_id'>) {
    if (lock.current) return
    if (
      pending.current &&
      JSON.stringify({ ...pending.current, p_operation_id: '' }) !==
        JSON.stringify({ ...args, p_operation_id: '' })
    ) {
      setError('이전 작업의 결과를 먼저 다시 확인해 주세요.')
      return
    }
    lock.current = true
    setBusy(true)
    request.current++
    pending.current ??= { ...args, p_operation_id: crypto.randomUUID() }
    try {
      apply(await actBaitProduction(pending.current))
      if(alive.current&&args.p_action==='buy')playPurchaseSound(pending.current.p_operation_id)
      if(alive.current&&args.p_action==='sell')playSaleSound(pending.current.p_operation_id)
      pending.current = null
      setError('')
      setSelected(null)
      if(args.p_action!=='buy'&&args.p_action!=='sell')toast.success(
        args.p_action === 'start'
            ? '미끼 생산을 시작했어요.'
            : args.p_action === 'claim'
              ? '생산한 미끼를 받았어요.'
              : '만료된 생산물을 정리했어요.',
      )
    } catch (e) {
      if (/^[0-9A-Z]{5}$/.test(String((e as { code?: string })?.code))) pending.current = null
      setError(baitProductionError(e))
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  const working = state?.activeTotal ?? state?.sites.filter((s) => status(s, now) === 'working').length ?? 0
  const items = shop
    ? filterBaitProductionShop(state?.facilities??[],shopFilters)
    : state?.sites.filter(s=>filter==='all'||status(s,now)===filter)??[]
  const active = selected
    ? (shop ? state?.facilities : state?.sites)?.find(
        (s) => (s.siteId ?? s.id) === (selected.siteId ?? selected.id),
      )
    : null
  return (
    <section
      aria-label={shop ? '미끼 생산소 상점' : '미끼 생산소'}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="shrink-0 space-y-3 bg-background px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <appArt.fuel className="size-5" />
            보유 연료 {state?.fuel.toLocaleString() ?? '—'}
          </span>
          <Link
            className="flex min-h-9 items-center gap-1 text-primary"
            to={shop ? '/bait-production' : '/bait-production-shop'}
          >
            {shop ? '내 미끼 생산소' : '상점 둘러보기'}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {!shop && <p className="text-xs leading-5 text-muted-foreground">
          보유 {state?.sites.length ?? 0}곳 · 미끼 생산소 가동 <b className="text-primary">{working}/4</b>
        </p>}
        {shop ? (
          <BaitProductionShopFilters value={shopFilters} onChange={setShopFilters}/>
        ) : (
          <div
            aria-label="생산소 상태"
            className="grid grid-cols-5 gap-1 rounded-xl bg-secondary/45 p-1"
          >
            {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
              <button
                key={k}
                aria-pressed={filter === k}
                onClick={() => setFilter(k)}
                className={`min-h-11 rounded-lg text-[11px] ${filter === k ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}
              >
                {labels[k]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-xl bg-destructive/5 p-3 text-xs text-destructive"
          >
            {error}
            <button
              disabled={busy}
              className="ml-2 min-h-9 underline"
              onClick={() => (pending.current ? void mutate(pending.current) : void reload())}
            >
              다시 확인
            </button>
          </div>
        )}
        {!state && !error && (
          <p role="status" className="flex justify-center gap-2 py-12 text-xs">
            <LoaderCircle className="size-4 animate-spin" />
            불러오는 중
          </p>
        )}
        {state && !items.length && (
          <div className="py-16 text-center text-xs text-muted-foreground">
            {shop ? '검색 조건에 맞는 생산소가 없어요.' : '표시할 생산소가 없어요.'}
            {!shop && (
              <Link to="/bait-production-shop" className="mt-4 block text-primary underline">
                첫 미끼 생산소 마련하기
              </Link>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {items.map((s) => {
            const st = status(s, now)
            return (
              <article
                key={s.siteId ?? s.id}
                className={`overflow-hidden rounded-2xl border ${!shop && st === 'ready' ? 'border-primary/40 bg-secondary/50' : 'border-border/80 bg-card'}`}
              >
                <button
                  disabled={busy || !!pending.current}
                  className="block w-full p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => {
                    if (!shop && status(s, Date.now() + offset.current) === 'ready') {
                      void mutate({p_action:'claim',p_facility:s.siteId!,p_quantity:1})
                      return
                    }
                    setQuantity(1)
                    setSelected(s)
                  }}
                >
                  <div className="relative aspect-square rounded-xl bg-secondary/25 p-5">
                    <LandscapeImage
                      retryable={false}
                      src={baitProductionArt(s)}
                      alt={s.name}
                      loading="lazy"
                      className={`size-full object-contain ${!shop&&st==='expired'?'grayscale opacity-45':''}`}
                    />
                    {!shop&&st==='working'&&<div data-production-working-overlay className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-stone-900/40 px-3 pt-8">
                      <div className="w-full max-w-40 text-center text-white [text-shadow:0_1px_3px_rgb(0_0_0/35%)]">
                        <p className="text-xs font-medium">가동 중</p>
                        <p className="mt-1 text-[10px] tabular-nums text-white/90">{remainingTime(s.completesAt!,now)} 남음</p>
                        <ProductionProgress site={s} now={now}/>
                      </div>
                    </div>}
                    {!shop&&<span className="absolute right-1 top-1 grid size-11 place-items-center rounded-full border bg-background/95 shadow-sm"><ProductionStatusSprite status={st}/></span>}
                    {!shop && st!=='working' && (
                      <span className="absolute bottom-2 left-2 right-2 rounded-lg bg-background/90 p-1.5 text-center text-[11px] text-primary">
                        {labels[st]}
                      </span>
                    )}
                  </div>
                  <h2 className="my-3 min-h-10 text-center text-[13px] font-medium text-primary">
                    {s.name}
                  </h2>
                  <Details site={s} />
                  {shop ? (
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-primary">
                      <GoldIcon className="size-5" />
                      {s.price.toLocaleString()}
                    </div>
                  ) : (
                    <p className="mt-3 min-h-9 text-center text-[11px] text-primary">
                      {st === 'working'
                        ? '생산이 완료되면 수령할 수 있어요.'
                        : st === 'ready'
                          ? `수령까지 ${remainingTime(s.expiresAt!, now)}`
                          : st === 'expired'
                            ? '만료된 생산물 정리'
                            : '눌러서 생산 시작'}
                    </p>
                  )}
                </button>
              </article>
            )
          })}
        </div>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null)
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{active?.name ?? selected?.name}</DialogTitle>
            <DialogDescription>{active?.description ?? selected?.description}</DialogDescription>
          </DialogHeader>
          {active && (
            <>
              <LandscapeImage
                retryable={false}
                src={baitProductionArt(active)}
                alt={active.name}
                className="mx-auto size-32 object-contain"
              />
              <Details site={active} />
              {shop ? (
                <>
                  <label className="flex items-center justify-between text-xs">
                    구매 수량
                    <input
                      aria-label="구매 수량"
                      type="number"
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.min(100, Math.max(1, Math.floor(Number(e.target.value) || 1))),
                        )
                      }
                      className="h-11 w-20 rounded-lg border text-center"
                    />
                  </label>
                  <Button
                    disabled={
                      busy || !!pending.current || !state || state.gold < active.price * quantity
                    }
                    onClick={() =>
                      void mutate({ p_action: 'buy', p_facility: active.id, p_quantity: quantity })
                    }
                  >
                    <GoldIcon className="size-5" />
                    {(active.price * quantity).toLocaleString()}골드로 구매
                  </Button>
                </>
              ) : selling ? (
                <>
                  <p className="text-xs leading-6 text-muted-foreground">
                    이 생산소를 상점 구매가의 50%인 {Math.floor(active.price/2).toLocaleString('ko-KR')}골드에 판매할까요? 판매하면 보유 목록에서 사라져요.
                  </p>
                  <Button variant="destructive" disabled={busy||active.startedAt!==null} onClick={()=>void mutate({p_action:'sell',p_facility:active.siteId!,p_quantity:1})}>판매 확정</Button>
                  <Button variant="outline" disabled={busy||!!pending.current} onClick={()=>setSelling(false)}>취소</Button>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="size-4" />
                    {status(active, now) === 'working'
                      ? `${remainingTime(active.completesAt!, now)} 후 완료`
                      : status(active, now) === 'ready'
                        ? `${remainingTime(active.expiresAt!, now)} 안에 수령해 주세요.`
                        : '보관 기간을 넘긴 생산물은 폐기됩니다.'}
                  </p>
                  <Button
                    disabled={
                      busy ||
                      !!pending.current ||
                      status(active, now) === 'working' ||
                      (status(active, now) === 'idle' &&
                        (working >= 4 || (state?.fuel ?? 0) < active.fuel_cost))
                    }
                    onClick={() =>
                      void mutate({
                        p_action:
                          status(active, now) === 'idle'
                            ? 'start'
                            : status(active, now) === 'ready'
                              ? 'claim'
                              : 'discard',
                        p_facility: active.siteId!,
                        p_quantity: 1,
                      })
                    }
                  >
                    {status(active, now) === 'idle'
                      ? working >= 4
                        ? '미끼 생산소가 4곳 가동 중이에요'
                        : `연료 ${active.fuel_cost}개로 생산 시작`
                      : status(active, now) === 'working'
                        ? '생산 중'
                        : status(active, now) === 'ready'
                          ? `${active.baitName} ${active.runOutput}개 받기`
                          : '만료된 생산물 정리'}
                  </Button>
                  <Button variant="outline" disabled={busy||!!pending.current||active.startedAt!==null} onClick={()=>setSelling(true)}>
                    {active.startedAt!==null?'생산물을 수령·정리한 뒤 판매할 수 있어요':<>판매 <GoldIcon className="size-4"/>{Math.floor(active.price/2).toLocaleString('ko-KR')}골드</>}
                  </Button>
                </>
              )}
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
