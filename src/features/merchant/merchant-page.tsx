import { PlayerAvatar } from '@/features/profile/player-avatar'
import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  PackageCheck,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import { GoldIcon } from '@/features/gold/gold-provider'
import { useAccountResource, useServerDeadlines } from '@/lib/account-query'
import { rarities } from '@/lib/game/rarity'
import { randomId } from '@/lib/random-id'
import { canDeliver, deliverMerchant, readMerchant, merchantError } from './api'
import type { MerchantItem, MerchantOrder } from './api'

type Pending = { order: string; operation: string; message: string }
function readPending(key: string): Pending | null {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? 'null')
    return typeof p?.order === 'string' && typeof p?.operation === 'string'
      ? { ...p, message: typeof p.message === 'string' ? p.message : '' }
      : null
  } catch {
    return null
  }
}
function ItemRow({ item, delivery = false, completed = false, details = false }: { item: MerchantItem; delivery?: boolean; completed?: boolean; details?:boolean }) {
  const enough = item.owned >= item.quantity
  return (
    <li className="flex min-w-0 items-center gap-3 py-2">
      <CollectibleThumbnail
        path={item.thumbnailPath}
        name={item.name}
        className="size-10 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm leading-5">{item.name}</p>
        {details&&<span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: rarities[item.rarity].effectColor }}
          />
          {rarities[item.rarity].label} ·{' '}
          {item.kind === 'fish' ? '물고기' : item.kind === 'trash' ? '쓰레기' : '장식물'}
        </span>}
      </div>
      <div className="shrink-0 text-right">
        {completed?<span className="text-xs tabular-nums text-muted-foreground">×{item.quantity}</span>:<span
          aria-label={`${item.name} 보유 ${item.owned}개, 필요 ${item.quantity}개`}
          className={`flex shrink-0 items-center gap-1 text-xs tabular-nums ${enough ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <span className="text-[9px] font-normal">보유</span><strong className="text-xs font-medium">
            {(delivery ? Math.min(item.owned, item.quantity) : item.owned).toLocaleString('ko-KR')}
          </strong>
          <span className="opacity-60">/ 필요 {item.quantity}</span>
          {enough && <Check aria-hidden className="size-3" />}
        </span>}
        {!completed && (delivery || !enough) && (
          <p className={`mt-1 text-[10px] ${enough ? 'text-primary' : 'text-destructive'}`}>
            {enough ? '자동으로 채웠어요' : `${item.quantity - item.owned}개 부족`}
          </p>
        )}
      </div>
    </li>
  )
}
export function MerchantPage() {
  const { session } = useAuth()
  return <AccountMerchant key={session?.user.id ?? 'guest'} owner={session?.user.id ?? 'guest'} />
}
function AccountMerchant({ owner }: { owner: string }) {
  const key = `pongdang:merchant:${owner}`
  const query = useAccountResource('merchant', readMerchant)
  const data = query.data
  const loading = query.isFetching
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<'open' | 'ready' | 'done'>('open'),
    [selected, setSelected] = useState<MerchantOrder | null>(null)
  const [message, setMessage] = useState('')
  const [dialogOpen,setDialogOpen]=useState(false)
  const [itemCount, setItemCount] = useState<0 | 1 | 2 | 3>(0)
  const [pending, setPending] = useState<Pending | null>(() => readPending(key))
  const now = useServerDeadlines(data?.serverNow, query.dataUpdatedAt, [data?.resetsAt])
  const alive = useRef(true),
    lock = useRef(false)
  const reload = query.refetch
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const expired = !!data && now >= Date.parse(data.resetsAt)
  useEffect(() => {
    if (expired && !busy) void reload()
  }, [expired, busy, reload])
  function remember(value: Pending | null) {
    setPending(value)
    try {
      if (value) localStorage.setItem(key, JSON.stringify(value))
      else localStorage.removeItem(key)
    } catch {
      /* The same operation stays available in memory. */
    }
  }
  async function submit(order?: MerchantOrder) {
    if (lock.current) return
    const request =
      pending ??
      (order ? { order: order.id, operation: randomId(), message: message.trim() } : null)
    if (!request) return
    lock.current = true
    setBusy(true)
    setError('')
    remember(request)
    try {
      const next = await deliverMerchant(request.order, request.operation, request.message)
      // Clear a confirmed receipt even when navigation unmounted the page.
      try {
        localStorage.removeItem(key)
      } catch {}
      if (alive.current) {
        remember(null)
        setDialogOpen(false)
        setMessage('')
        setFilter('done')
        toast.success(`납품 완료 · ${next.receipt?.gold.toLocaleString('ko-KR') ?? ''}골드`)
      }
    } catch (cause) {
      if (alive.current) {
        const code = String((cause as { code?: string })?.code ?? '')
        if (/^[0-9A-Z]{5}$/.test(code)) {
          remember(null)
          setDialogOpen(false)
        }
        setDialogOpen(false)
        void reload()
        setError(merchantError(cause))
        toast.error(merchantError(cause))
      }
    } finally {
      lock.current = false
      if (alive.current) {
        setBusy(false)
      }
    }
  }
  const orders =
    data?.orders.filter((order) =>
      filter === 'done'
        ? order.completed
        : filter === 'ready' ? canDeliver(order) : !order.completed && (itemCount === 0 || order.items.length === itemCount),
    ).sort((a,b)=>Number(canDeliver(b))-Number(canDeliver(a))||a.number-b.number) ?? []
  const active=data?.orders.find(order=>order.id===selected?.id)??selected
  const counts = {
    open: data?.orders.filter(order => !order.completed).length,
    ready: data?.orders.filter(canDeliver).length,
    done: data?.orders.filter(order => order.completed).length,
  }
  return (
    <section aria-label="바다 상인의 의뢰" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border/60 bg-background">
        <div
          role="group"
          aria-label="주문 필터"
          className="grid grid-cols-3 border-b border-border/60"
        >
          {(
            [
              ['open', '진행 중'],
              ['ready', '납품 가능'],
              ['done', '완료'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-description={counts[value] === undefined ? '의뢰 수를 불러오는 중' : `${counts[value]}개 의뢰`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`flex min-h-14 items-center justify-center border-r border-border/60 last:border-r-0 px-1 py-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${filter === value ? 'bg-secondary font-medium text-primary' : 'bg-background text-muted-foreground hover:bg-secondary/30'}`}
            >
              <span className="inline-flex items-center gap-1.5">
                {label}
                <span className="text-[11px] tabular-nums opacity-70">
                  {counts[value] ?? '–'}
                </span>
              </span>
            </button>
          ))}
        </div>
        {filter === 'open' && (
          <div
            role="group"
            aria-label="주문 종류 수"
            className="flex items-center gap-1 px-4 py-2"
          >
            {([0, 1, 2, 3] as const).map((count) => (
              <button
                key={count}
                type="button"
                aria-label={count === 0 ? '전체' : `${count}종`}
                aria-pressed={itemCount === count}
                onClick={() => setItemCount(count)}
                className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md px-3 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${itemCount === count ? 'bg-primary/5 font-medium text-primary' : 'text-muted-foreground hover:bg-secondary/40'}`}
              >
                <span>{count === 0 ? '전체' : `${count}종`}</span>
                <span className="text-[10px] tabular-nums opacity-60">
                  {data?.orders.filter(
                    (order) => !order.completed && (count === 0 || order.items.length === count),
                  ).length ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] leading-5 text-muted-foreground">
            서버 공통 선착순 · 보관함 개체로 납품해요.
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="주문 새로고침"
            disabled={loading || busy}
            onClick={() => {setError('');void reload()}}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {(error || query.error) && (
          <div
            role="alert"
            className="space-y-2 rounded-xl border border-border bg-card p-3 text-xs leading-5"
          >
            <p>{error || merchantError(query.error)}</p>
            {!pending && (
              <Button size="sm" variant="outline" onClick={() => {setError('');void reload()}}>
                목록 새로고침
              </Button>
            )}
          </div>
        )}
        {pending && (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-secondary/40 p-3">
            <p className="text-xs leading-5">
              이전 납품 결과를 확인해주세요. 다시 눌러도 중복 지급되지 않아요.
            </p>
            <Button className="w-full" disabled={busy} onClick={() => void submit()}>
              {busy ? '확인 중…' : '납품 결과 다시 확인'}
            </Button>
          </div>
        )}
        {loading && !data ? (
          <div role="status" className="space-y-3 py-3">
            <span className="sr-only">주문을 불러오는 중</span>
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 animate-pulse rounded-xl bg-secondary/50" />
            ))}
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className={`min-w-0 overflow-hidden rounded-xl border bg-card ${canDeliver(order)?'border-primary/35':'border-border/60'}`}
              >
               <div className="relative">
                <button
                  type="button"
                  aria-label={`주문 ${String(order.number).padStart(2, '0')} 상세 보기`}
                  disabled={busy}
                  onClick={() => {
                    setMessage('')
                    setSelected(order);setDialogOpen(true)
                  }}
                  className="absolute inset-0 flex w-full items-center justify-end rounded-t-xl pr-3 text-muted-foreground outline-none transition-colors hover:bg-secondary/20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <ChevronRight aria-hidden className="size-3.5 opacity-50" />
                </button>
                {canDeliver(order) && !expired && <p className="pointer-events-none relative px-4 pt-3 text-[11px] font-medium text-primary">바로 납품 가능</p>}
                <ul className="pointer-events-none relative space-y-1 py-3 pr-9 pl-4">
                  {order.items.map((item) => (
                    <ItemRow key={item.speciesId} item={item} completed={order.completed}/>
                  ))}
                </ul>
               </div>
                <div className="flex min-h-14 items-center justify-between gap-3 px-4 pb-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-base font-medium tabular-nums text-primary">
                      <GoldIcon className="size-4" />
                      {order.rewardGold.toLocaleString('ko-KR')}
                    </p>
                  </div>
                  {order.completed?<span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Check aria-hidden className="size-3"/>{order.mine?'내가 납품':'납품 완료'}</span>:canDeliver(order)?(
                    <Button
                      className="min-h-11 shrink-0 rounded-md px-4 text-xs"
                      disabled={busy || !!pending || expired}
                      onClick={() => {
                        setMessage('')
                        setSelected(order);setDialogOpen(true)
                      }}
                    >
                      납품하기
                    </Button>
                  ):<Button variant="ghost" className="min-h-11 shrink-0 rounded-md px-2 text-[11px] text-muted-foreground" disabled={busy} onClick={()=>{setMessage('');setSelected(order);setDialogOpen(true)}}>{order.items.reduce((total,item)=>total+Math.max(0,item.quantity-item.owned),0)}개 부족</Button>}
                </div>
                {order.completed && order.delivery && (
                  <div className="mx-4 flex items-start gap-2 border-t border-border/40 py-3">
                    <PlayerAvatar level={order.delivery.level} levelProgress={order.delivery.levelProgress}
                      nickname={order.delivery.nickname}
                      path={order.delivery.avatarPath}
                      className="size-6 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="break-words font-medium">{order.delivery.nickname}</span>
                      </p>
                      {order.delivery.message&&<p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground">{order.delivery.message}</p>}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {!loading && data && !orders.length && (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <PackageCheck className="size-8 opacity-40" />
            <p className="text-sm">
              {filter === 'ready'
                ? '지금 납품할 수 있는 주문이 없어요.'
                : filter === 'done'
                  ? '아직 완료된 주문이 없어요.'
                  : itemCount > 0
                    ? `${itemCount}종으로 구성된 진행 중 주문이 없어요.`
                    : '오늘 주문이 모두 마감됐어요.'}
            </p>
            <p className="text-xs">
              {filter === 'ready'
                ? '어항의 개체는 보관함으로 옮긴 뒤 확인해주세요.'
                : filter === 'open' && itemCount > 0
                  ? '전체 또는 다른 종류 수를 선택해주세요.'
                  : '새 주문은 한국 시간 자정에 도착해요.'}
            </p>
          </div>
        )}
      </div>
      <Dialog
        open={dialogOpen}
        onOpenChangeComplete={open=>{if(!open&&!dialogOpen)setSelected(null)}}
        onOpenChange={(value) => {
          if (!value && !busy) setDialogOpen(false)
        }}
      >
        <DialogContent
          className="flex max-h-[85dvh] w-[calc(100%-2rem)] min-w-0 max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md"
          showCloseButton={!busy}
        >
          <DialogHeader className="shrink-0 px-4 pt-4 pb-3 pr-12">
            <DialogTitle className="text-base font-normal">
              {active?.completed
                ? '완료된 주문'
                : active && canDeliver(active)
                  ? '상인에게 납품할까요?'
                  : '납품할 개체 확인'}
            </DialogTitle>
            <DialogDescription className="text-xs leading-5">
              {active?.completed
                ? '완료된 주문의 구성과 지급액을 확인해요.'
                : '납품하면 아래 개체가 보관함에서 판매됩니다. 완료한 납품은 되돌릴 수 없어요.'}
            </DialogDescription>
          </DialogHeader>
          {active && (
            <>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4">
              {!active.completed && (
                <p className="rounded-lg bg-secondary/40 px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">
                  보관함에서 필요한 수량을 자동으로 채워요. 어항에 있는 개체는 포함되지 않아요.
                </p>
              )}
              <ul className="divide-y divide-border/50">
                {active.items.map((item) => (
                  <ItemRow key={item.speciesId} item={item} delivery={!active.completed} completed={active.completed} details/>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                <span>일반 판매가</span>
                <span className="tabular-nums">
                  {active.baseGold.toLocaleString('ko-KR')}골드
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs text-muted-foreground">추가 보상</span>
                <span className="text-xs tabular-nums text-primary">
                  +{Math.max(0, active.rewardGold - active.baseGold).toLocaleString('ko-KR')}골드
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>받는 골드</span>
                <strong className="flex items-center gap-1.5 text-xl font-medium tabular-nums text-primary">
                  <GoldIcon className="size-5" />
                  {active.rewardGold.toLocaleString('ko-KR')}
                </strong>
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                선착순이라 확인하는 동안 다른 모험가가 먼저 납품할 수 있어요.
              </p>
              {canDeliver(active) && (
                <label className="space-y-2 text-xs">
                  <span className="flex items-center justify-between text-muted-foreground">
                    <span>
                      납품하며 한마디 <span className="text-[10px]">· 선택</span>
                    </span>
                    <span className="text-[10px] tabular-nums">{message.length} / 80</span>
                  </span>
                  <textarea
                    aria-label="납품 한마디"
                    value={message}
                    maxLength={80}
                    rows={2}
                    disabled={busy}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="잘 모아왔어요. 다음 의뢰도 기대할게요!"
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
                  />
                  <span className="block text-[10px] leading-4 text-muted-foreground">
                    완료 카드에 내 아바타·이름과 함께 모두에게 보여요.
                  </span>
                </label>
              )}
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
              </div><div className="shrink-0 border-t border-border/60 bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {canDeliver(active) ? (
                <Button
                  className="min-h-12 w-full rounded-xl"
                  disabled={busy || expired || !!pending}
                  onClick={() => void submit(active)}
                >
                  {busy
                    ? '납품 확인 중…'
                    : `${active.rewardGold.toLocaleString('ko-KR')}골드 받고 납품`}
                </Button>
              ) : (
                !active.completed && (
                  <Button className="min-h-12 w-full rounded-xl" disabled>
                    개체가 부족해요
                  </Button>
                )
              )}
            </div></>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
