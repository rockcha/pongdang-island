import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Minus,
  Plus,
  Search,
} from 'lucide-react'
import { Link } from 'react-router'
import { appArt } from '@/components/app-art'
import { useAuth } from '@/components/auth-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { randomId } from '@/lib/random-id'
import { personalBaitFuel, type PersonalBaitAction } from './personal-bait-api'
import { usePersonalBaitWorkshop } from './use-personal-bait-workshop'
import { loadFishing, type FishingBait } from '@/features/fishing/api'
import { BaitOddsBars } from '@/features/fishing/bait-info'

export function PersonalBaitWorkshopLink() {
  return (
    <Link
      to="/my-bait-production"
      aria-label="나만의 미끼 생산소"
      className="group relative mb-4 flex min-h-24 items-center overflow-hidden rounded-2xl border border-primary/15 bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src="/banners/my-bait-production.png"
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#244c43]/95 via-[#244c43]/75 to-transparent"
      />
      <span className="relative min-w-0 flex-1 py-4 pl-4 pr-2 text-white">
        <span className="mb-1 block text-[9px] tracking-wider text-white/70">
          나의 작은 미끼 공방
        </span>
        <span className="block text-sm font-medium">나만의 미끼 생산소</span>
        <span className="mt-1 block text-[10px] text-white/80">
          미끼·수량·시간을 정해 만들어보세요
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="relative mr-4 size-4 shrink-0 text-white transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}
function workshopDuration(minutes: number) {
  return [
    Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}시간` : '',
    minutes % 60 ? `${minutes % 60}분` : '',
  ]
    .filter(Boolean)
    .join(' ')
}
export function PersonalBaitWorkshopPage() {
  const { session } = useAuth()
  return <AccountWorkshop key={session?.user.id ?? 'guest'} />
}
function AccountWorkshop() {
  const { state, error, busy, pending, now, reload, run } = usePersonalBaitWorkshop()
  const [baitId, setBaitId] = useState('bait'),
    [quantity, setQuantity] = useState('10'),
    [minutes, setMinutes] = useState(30)
  const [picker, setPicker] = useState(false),
    [search, setSearch] = useState(''),
    [confirmation, setConfirmation] = useState<PersonalBaitAction | null>(null)
  const [effects, setEffects] = useState<FishingBait[]>([]),
    [effectsError, setEffectsError] = useState(false),
    [effectsAttempt, setEffectsAttempt] = useState(0)
  const [pickerPage, setPickerPage] = useState(0)
  useEffect(() => {
    let active = true
    const refresh = () => {
      if (document.hidden) return
      loadFishing()
        .then((data) => {
          if (active) {
            setEffects(data.baits)
            setEffectsError(false)
          }
        })
        .catch(() => {
          if (active) setEffectsError(true)
        })
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [effectsAttempt])
  const bait = state?.baits.find((b) => b.id === baitId) ?? state?.baits[0],
    q = Number(quantity)
  const baitEffect = effects.find((b) => b.id === bait?.id)
  const filteredBaits = state?.baits.filter((b) => b.name.includes(search.trim())) ?? []
  const pickerPages = Math.max(1, Math.ceil(filteredBaits.length / 4)),
    currentPage = Math.min(pickerPage, pickerPages - 1)
  const cost = bait ? personalBaitFuel(bait.unitValue, q, minutes) : null
  const job = state?.job,
    ready = Boolean(job && now >= Date.parse(job.completesAt))
  const remaining = job ? Math.max(0, Math.ceil((Date.parse(job.completesAt) - now) / 1000)) : 0
  const progress = job
    ? Math.max(
        0,
        Math.min(
          100,
          ((now - Date.parse(job.startedAt)) /
            (Date.parse(job.completesAt) - Date.parse(job.startedAt))) *
            100,
        ),
      )
    : 0
  const enough = cost !== null && state !== null && state.fuel >= cost
  async function confirm() {
    if (confirmation) {
      await run(confirmation)
      setConfirmation(null)
    }
  }
  return (
    <section aria-label="나만의 미끼 생산소" className="flex min-h-0 flex-1 flex-col px-4">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b py-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-primary">보유 연료</span>
        <span className="flex items-center gap-1">
          <appArt.fuel className="size-5" />
          <span className="sr-only">보유 연료 </span>
          {state ? state.fuel.toLocaleString() : '—'}개
        </span>
      </div>
      <div data-workshop-body className="flex min-h-0 flex-1 flex-col gap-2 pt-1">
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5"
          >
            {error}
            {!pending && (
              <button className="ml-2 underline" onClick={() => void reload()}>
                새로고침
              </button>
            )}
          </div>
        )}
        {pending && (
          <div className="mb-3 rounded-xl border bg-secondary/40 p-3 text-xs leading-5">
            <p>이전 요청의 처리 결과를 확인해 주세요.</p>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              disabled={busy}
              onClick={() => void run(pending)}
            >
              {busy ? '확인 중…' : '이전 요청 다시 확인'}
            </Button>
          </div>
        )}
        {!state ? (
          <div
            role="status"
            className="flex flex-col items-center gap-3 py-16 text-xs text-muted-foreground"
          >
            <LoaderCircle className="size-5 animate-spin" />
            공방을 준비하고 있어요
          </div>
        ) : job ? (
          <div className="rounded-2xl bg-secondary/20 p-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-[11px] text-primary">
              {ready ? <Check className="size-3.5" /> : <Clock3 className="size-3.5" />}
              {ready ? '미끼가 완성됐어요' : '정성껏 만들고 있어요'}
            </span>
            <img src={job.imagePath} alt="" className="mx-auto my-3 size-16 object-contain" />
            <h2 className="text-base">
              {job.baitName} <span className="text-primary">{job.quantity}개</span>
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {workshopDuration(job.minutes)} 생산 · 연료 {job.fuelCost.toLocaleString()}개 사용
            </p>
            <div
              role="progressbar"
              aria-label="미끼 생산 진행률"
              aria-valuenow={Math.floor(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10"
            >
              <div
                className="h-full rounded-full bg-primary/65 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm tabular-nums" aria-live="off">
              {ready
                ? '지금 수령할 수 있어요'
                : `${Math.floor(remaining / 3600)
                    .toString()
                    .padStart(2, '0')}:${Math.floor((remaining % 3600) / 60)
                    .toString()
                    .padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')} 남음`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <label className="sr-only">만들 미끼</label>
              <button
                disabled={busy || !!pending}
                onClick={() => {
                  setSearch('')
                  setPickerPage(0)
                  setPicker(true)
                }}
                className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-secondary/25 p-2 text-left"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background">
                  <img src={bait?.imagePath} alt="" className="size-8 object-contain" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{bait?.name ?? '생산 가능한 미끼 없음'}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    보유 {(bait?.owned ?? 0).toLocaleString()}개
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </button>
              <div className="mt-2" aria-label="선택한 미끼 확률">
                {baitEffect ? (
                  <BaitOddsBars bait={baitEffect} compact />
                ) : (
                  !effectsError && (
                    <div
                      role="status"
                      aria-label="확률 불러오는 중"
                      className="h-8 animate-pulse rounded bg-secondary/30"
                    />
                  )
                )}
                {effectsError && (
                  <button
                    className="shrink-0 text-[11px] leading-5 underline"
                    onClick={() => setEffectsAttempt((a) => a + 1)}
                  >
                    확률 다시 불러오기
                  </button>
                )}
              </div>
            </div>
            <fieldset disabled={busy || !!pending}>
              <legend className="sr-only">생산 수량</legend>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs">
                  생산 수량
                  <span className="mt-1 block text-[10px] text-muted-foreground">최대 100개</span>
                </span>
                <div className="flex h-10 w-44 max-w-[65%] items-center rounded-xl bg-secondary/25">
                  <button
                    aria-label="수량 줄이기"
                    className="grid h-full w-12 place-items-center"
                    disabled={q <= 1}
                    onClick={() => setQuantity(String(Math.max(1, (q || 1) - 1)))}
                  >
                    <Minus className="size-4" />
                  </button>
                  <input
                    aria-label="생산 수량"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-center text-base tabular-nums outline-none"
                  />
                  <span className="text-xs text-muted-foreground">개</span>
                  <button
                    aria-label="수량 늘리기"
                    className="grid h-full w-12 place-items-center"
                    disabled={q >= 100}
                    onClick={() => setQuantity(String(Math.min(100, (q || 0) + 1)))}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </fieldset>
            <fieldset disabled={busy || !!pending}>
              <legend className="flex w-full items-center justify-between text-xs font-medium">
                <span>소요 시간</span>
                <span className="text-lg font-normal tabular-nums text-primary">
                  {workshopDuration(minutes)}
                </span>
              </legend>
              <div className="relative flex h-11 items-center">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-primary/10"
                >
                  <div
                    className="h-full rounded-full bg-primary/65"
                    style={{ width: `${((minutes - 30) / 690) * 100}%` }}
                  />
                </div>
                <input
                  aria-label="소요 시간"
                  aria-valuetext={workshopDuration(minutes)}
                  type="range"
                  min={30}
                  max={720}
                  step={30}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="relative h-11 w-full cursor-pointer appearance-none rounded-full bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary"
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>30분</span>
                <span>12시간</span>
              </div>
            </fieldset>
          </div>
        )}
      </div>
      {state && (
        <footer className="shrink-0 border-t bg-background pb-2 pt-2">
          {job ? (
            <Button
              className="min-h-12 w-full rounded-xl"
              disabled={!ready || busy || !!pending}
              onClick={() =>
                void run({ p_action: 'claim', p_operation_id: randomId(), p_job_id: job.id })
              }
            >
              {busy
                ? '처리 중…'
                : ready
                  ? `${job.baitName} ${job.quantity}개 수령하기`
                  : '미끼를 만들고 있어요'}
            </Button>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  필요한 연료
                </span>
                <span className="flex items-center gap-1.5">
                  <appArt.fuel className="size-6" />
                  <strong className="text-xl font-normal tabular-nums">
                    {cost?.toLocaleString() ?? '—'}
                  </strong>
                  <span className="text-xs">개</span>
                </span>
              </div>
              <Button
                className="min-h-12 w-full rounded-xl"
                disabled={!enough || busy || !!pending || !bait}
                aria-label={enough&&cost!==null?`생산 시작 (연료 ${cost.toLocaleString()})`:undefined}
                onClick={() =>
                  setConfirmation({
                    p_action: 'start',
                    p_operation_id: randomId(),
                    p_bait_id: bait!.id,
                    p_quantity: q,
                    p_minutes: minutes,
                    p_expected_fuel: cost!,
                  })
                }
              >
                {cost === null
                  ? '수량을 확인해 주세요'
                  : !enough
                    ? '연료가 부족해요'
                    : <>생산 시작 <span className="inline-flex items-center gap-1">(<appArt.fuel className="size-5"/>{cost.toLocaleString()})</span></>}
              </Button>
            </>
          )}
        </footer>
      )}
      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-3 overflow-hidden rounded-2xl p-4">
          <DialogHeader>
            <DialogTitle>만들 미끼 선택</DialogTitle>
            <DialogDescription className="sr-only">
              미끼의 등급별 확률을 비교하고 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              aria-label="미끼 검색"
              placeholder="미끼 이름 검색"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPickerPage(0)
              }}
              className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none"
            />
          </div>
          <div aria-label="미끼 목록" className="grid min-h-0 grid-cols-2 gap-2">
            {filteredBaits.slice(currentPage * 4, currentPage * 4 + 4).map((b) => (
              <button
                key={b.id}
                aria-pressed={b.id === bait?.id}
                onClick={() => {
                  setBaitId(b.id)
                  setPicker(false)
                }}
                aria-label={`${b.name} · 보유 ${b.owned.toLocaleString()}개`}
                className={`flex min-w-0 flex-col rounded-xl border p-2 text-left ${b.id === bait?.id ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
              >
                <span className="mb-2 flex min-h-9 items-center gap-1.5">
                  <img src={b.imagePath} alt="" className="size-7 shrink-0 object-contain" />
                  <span className="min-w-0 text-[11px] leading-4">
                    {b.name}
                    <span className="mt-0.5 block text-[9px] text-muted-foreground">
                      보유 {b.owned.toLocaleString()}개
                    </span>
                  </span>
                </span>
                <div className="mt-auto w-full">
                  {effects.find((effect) => effect.id === b.id) ? (
                    <BaitOddsBars bait={effects.find((effect) => effect.id === b.id)!} compact />
                  ) : (
                    <span className="block h-8 rounded bg-secondary/30" />
                  )}
                </div>
              </button>
            ))}
            {state && !state.baits.some((b) => b.name.includes(search.trim())) && (
              <p className="col-span-2 py-8 text-center text-xs text-muted-foreground">
                검색 결과가 없어요.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between border-t pt-2">
            <button
              aria-label="이전 미끼 목록"
              disabled={currentPage === 0}
              onClick={() => setPickerPage(currentPage - 1)}
              className="grid size-10 place-items-center rounded-lg hover:bg-secondary disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span role="status" className="text-[11px] tabular-nums text-muted-foreground">
              {currentPage + 1} / {pickerPages}
            </span>
            <button
              aria-label="다음 미끼 목록"
              disabled={currentPage >= pickerPages - 1}
              onClick={() => setPickerPage(currentPage + 1)}
              className="grid size-10 place-items-center rounded-lg hover:bg-secondary disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null)
        }}
        compact
        title={`${state?.baits.find((b) => b.id === confirmation?.p_bait_id)?.name ?? '미끼'} ${confirmation?.p_quantity ?? 0}개를 만들까요?`}
        description={`${workshopDuration(confirmation?.p_minutes ?? 30)} 동안 생산하며, 연료 ${confirmation?.p_expected_fuel?.toLocaleString() ?? 0}개를 사용해요. 시작 후에는 취소할 수 없어요.`}
        confirmLabel="생산 시작"
        busy={busy}
        confirmDisabled={!!pending && pending.p_operation_id !== confirmation?.p_operation_id}
        error={error}
        onConfirm={() => void confirm()}
      />
    </section>
  )
}
