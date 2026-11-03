import { Check, ChevronDown, ChevronRight, Clock3, Shell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RelicIcon } from '@/components/collection-filter-icons'
import { GoldIcon } from '@/features/gold/gold-provider'
import { remainingTime } from './savings-time'
import type { SavingsAccount } from './api'

const number = (value: number) => value.toLocaleString('ko-KR')
const date = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
export function SavingsMoney({ value, large = false }: { value: number; large?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 tabular-nums ${large ? 'text-[32px] font-semibold leading-tight tracking-tight' : 'font-medium'}`}
    >
      <GoldIcon className={large ? 'size-7' : 'size-4'} />
      {number(value)}
    </span>
  )
}

function SavingsDeadlineNotice() {
  return (
    <div className="flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
      <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="space-y-1 text-xs leading-5">
        <p className="font-medium text-primary">한 번이라도 납입 기한을 놓치면 보너스를 받을 수 없어요.</p>
        <p className="text-[11px] text-muted-foreground">기본·유물 보너스 없이 납입한 원금만 돌려받아요. 납입 기한은 가입 시각 기준 24시간 단위예요.</p>
      </div>
    </div>
  )
}

type PlanProps = {
  plans: readonly { days: 3 | 5 | 7; bonus: number }[]
  term: 3 | 5 | 7
  amount: string
  valid: boolean
  disabled: boolean
  gold: number
  principal: number
  bonus: number
  bonusPercent: number
  relicBonusPercent?: number
  onTerm: (term: 3 | 5 | 7) => void
  onAmount: (amount: string) => void
  onStart: () => void
}
export function SavingsPlanPanel({
  plans,
  term,
  amount,
  valid,
  disabled,
  gold,
  principal,
  bonus,
  bonusPercent,
  relicBonusPercent=0,
  onTerm,
  onAmount,
  onStart,
}: PlanProps) {
  return (
    <div className="space-y-5">
      <fieldset disabled={disabled}>
        <legend className="mb-2.5 text-xs font-medium">얼마 동안 모을까요?</legend>
        <div className="grid grid-cols-3 gap-2">
          {plans.map((plan) => (
            <button
              key={plan.days}
              type="button"
              aria-pressed={term === plan.days}
              onClick={() => onTerm(plan.days)}
              className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${term === plan.days ? 'border-primary bg-primary/5 text-primary' : 'border-border/70 bg-background text-muted-foreground hover:bg-secondary/40'}`}
            >
              <span className="text-lg font-medium">{plan.days}일</span>
              <span className="text-[11px]">
                보너스 <strong className="font-semibold">+{plan.bonus}%</strong>
              </span>
              {term === plan.days && (
                <Check aria-hidden="true" className="absolute right-1.5 top-1.5 size-3" />
              )}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="savings-amount" className="text-xs font-medium">
            매일 넣을 골드
          </label>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            보유 {number(gold)}골드
          </span>
        </div>
        <div className="relative">
          <Input
            id="savings-amount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            disabled={disabled}
            onChange={(event) => {
              if (/^\d*$/.test(event.target.value)) onAmount(event.target.value)
            }}
            aria-describedby="savings-amount-help"
            aria-invalid={amount !== '' && !valid}
            className="h-12 rounded-xl pr-14 text-lg tabular-nums"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            골드
          </span>
        </div>
        <div role="group" aria-label="납입 금액 바로 선택" className="grid grid-cols-4 gap-2">
          {[100, 500, 1000, 5000].map((value) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              aria-pressed={amount === String(value)}
              aria-label={`매일 ${number(value)}골드 선택`}
              onClick={() => onAmount(String(value))}
              className={`min-h-10 rounded-lg border text-[11px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${amount === String(value) ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border/60 bg-background text-muted-foreground hover:bg-secondary/40'}`}
            >
              {number(value)}
            </button>
          ))}
        </div>
        <p id="savings-amount-help" className="text-[10px] leading-5 text-muted-foreground">
          하루 10~5,000골드 · 가입 후 금액은 바꿀 수 없어요.
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-background p-4">
        <dl className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">총 납입 · {term}회</dt>
            <dd className="tabular-nums">{valid ? number(principal) : '—'}골드</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">만기 보너스 {bonusPercent}%{relicBonusPercent>0&&<span className="block text-[10px]">이자에 유물 보너스 +{relicBonusPercent}% 포함</span>}</dt>
            <dd className="tabular-nums text-primary">{valid ? '+' + number(bonus) : '—'}골드</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
            <dt className="text-xs font-medium">만기에 받는 골드</dt>
            <dd className="flex items-baseline gap-1 text-primary">
              {valid ? (
                <SavingsMoney value={principal + bonus} large />
              ) : (
                <span className="text-2xl">—</span>
              )}
              <span className="text-[10px]">골드</span>
            </dd>
          </div>
        </dl>
      </div>
      <div className="space-y-3">
        <SavingsDeadlineNotice />
        <p className="text-[11px] leading-5 text-muted-foreground">
          가입 순간 장착한 유물의 효과가 적용돼요. 가입 후 유물을 바꿔도 해당 적금의 효과는 유지돼요.
          {relicBonusPercent > 0 && <span className="mt-1 block text-primary">현재 유물 · 기본 이자에 +{relicBonusPercent}% 추가</span>}
        </p>
        <Button
          className="min-h-12 w-full rounded-xl text-xs"
          disabled={disabled || !valid || gold < Number(amount)}
          onClick={onStart}
        >
          {valid ? `첫 ${number(Number(amount))}골드 넣고 시작하기` : '금액을 입력해주세요'}
          <ChevronRight className="size-4" />
        </Button>
        {valid && gold < Number(amount) ? (
          <p className="text-center text-[11px] text-destructive">
            첫 납입에 필요한 골드가 부족해요.
          </p>
        ) : (
          <p className="text-center text-[10px] text-muted-foreground">
            시작할 때 첫 회차 골드가 바로 들어가요.
          </p>
        )}
      </div>
    </div>
  )
}

type AccountProps = {
  account: SavingsAccount
  status: SavingsAccount['status']
  now: number
  gold: number
  disabled: boolean
  onDeposit: () => void
  onWithdraw: () => void
  onCancel: () => void
}
export function SavingsAccountPanel({
  account,
  status,
  now,
  gold,
  disabled,
  onDeposit,
  onWithdraw,
  onCancel,
}: AccountProps) {
  const full = account.paid_count === account.term_days,
    due = status === 'due',
    matured = status === 'matured',
    missed = status === 'missed'
  const target = due ? account.depositDeadline : full ? account.maturesAt : account.nextOpenAt
  const urgent = due && target !== null && Date.parse(target) - now <= 3600000
  const relicBonus = account.relicBonusPercent ?? 0
  const interestRate = missed ? 0 : account.bonusPercent * (1 + relicBonus / 100)
  const finalPrincipal = account.daily_amount * account.term_days
  return (
    <div className="space-y-3">
      <section
        aria-labelledby="savings-balance-title"
        className="savings-shell-panel overflow-hidden rounded-2xl border border-border/70 bg-background"
      >
        <div className="px-4 pb-5 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">조개적금</h2>
            <span className={`rounded-full px-2.5 py-1 text-[11px] ${missed ? 'bg-destructive/5 text-destructive' : 'bg-primary/5 text-primary'}`}>
              {missed ? '납입 기한 지남' : matured ? '만기 완료' : '진행 중'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{account.term_days}일 적금 · {account.paid_count} / {account.term_days}회 납입</p>
          <h3 id="savings-balance-title" className="mt-6 text-xs text-muted-foreground">현재 모은 골드</h3>
          <p className="mt-2 flex items-baseline gap-1.5">
            <SavingsMoney value={account.principal} large />
            <span className="text-xs text-muted-foreground">골드</span>
          </p>
          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">최종 이자율</dt><dd className="font-medium tabular-nums">{number(interestRate)}%</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{missed ? '돌려받는 원금' : '만기 예상 수령'}</dt><dd className="text-base font-semibold tabular-nums text-primary">{number(missed ? account.principal : account.expectedPayout)}<span className="ml-1 text-[10px] font-normal">골드</span></dd></div>
          </dl>
          <p className="mt-2 text-right text-[10px] leading-5 text-muted-foreground">{missed ? '기한을 놓쳐 이자가 지급되지 않아요.' : `총 ${number(finalPrincipal)}골드 납입 시 · 이자 ${number(account.expectedBonus)}골드 포함`}</p>
          <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
            <div>
              <p className={`flex items-center gap-1.5 text-xs font-medium ${missed ? 'text-destructive' : 'text-primary'}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current"/>{missed ? '보너스 지급 불가' : matured ? '보너스 확정' : '보너스 유지 중'}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{missed ? '납입 기한이 지나 기본·유물 보너스 없이 원금만 돌려받아요.' : full ? '모든 회차를 기한 내 납입했어요.' : '현재까지 기한을 지켰어요. 다음 납입도 기한 내 완료해주세요.'}</p>
            </div>
            {relicBonus > 0 ? <div className="flex items-center gap-2.5 rounded-xl bg-primary/5 px-3 py-2.5"><RelicIcon className="size-8 shrink-0 object-contain"/><div><p className="text-[11px] font-medium text-primary">유물 효과 받고 가입했어요</p><p className="mt-0.5 text-[10px] leading-5 text-muted-foreground">가입 시 기본 이자 +{relicBonus}% 확정{missed ? ' · 현재 보너스 지급 불가' : ' · 장착 변경과 무관'}</p></div></div> : <p className="text-[11px] text-muted-foreground">유물 효과 없이 가입한 적금이에요.</p>}
          </div>
        </div>
        <div
          className={`space-y-3 border-t border-border/60 p-4 ${urgent ? 'bg-amber-50/70 dark:bg-amber-950/20' : matured ? 'bg-primary/5' : 'bg-secondary/25'}`}
        >
          {(matured || missed) && <p className="text-xs leading-5">{matured ? '원금과 만기 보너스를 받을 수 있어요.' : '모아둔 원금을 돌려받을 수 있어요.'}</p>}
          {target && !missed && !matured && (
            <p
              className={`flex flex-wrap items-center justify-between gap-2 text-xs ${urgent ? 'text-amber-900 dark:text-amber-200' : 'text-muted-foreground'}`}
            >
              <span className="inline-flex items-center gap-1">
                {due ? '납입 마감까지' : full ? '만기까지' : '다음 납입까지'}
              </span>
              <span className={`text-lg font-semibold tabular-nums tracking-wide ${urgent ? 'text-amber-900 dark:text-amber-200' : 'text-primary'}`}>
                {remainingTime(target, now)}
              </span>
            </p>
          )}
          {!full && !missed && account.nextOpenAt && account.depositDeadline && <div className="text-[10px] leading-5 text-muted-foreground"><p>납입 가능 시간</p><p className="tabular-nums">{date(account.nextOpenAt)} ~ {date(account.depositDeadline)} (한국 시간)</p></div>}
          {urgent && (
            <p className="text-[10px] leading-5 text-amber-900 dark:text-amber-200">
              마감까지 1시간 이내예요. 이번 회차를 납입해주세요.
            </p>
          )}
          {due ? (
            <>
              <Button
                className="min-h-12 w-full rounded-xl text-xs"
                disabled={disabled || gold < account.daily_amount}
                onClick={onDeposit}
              >
                {number(account.daily_amount)}골드 넣기
              </Button>
              {gold < account.daily_amount && (
                <p className="text-[11px] text-destructive">납입할 골드가 부족해요.</p>
              )}
            </>
          ) : matured || missed ? (
            <Button
              className="min-h-12 w-full rounded-xl text-xs"
              disabled={disabled}
              onClick={onWithdraw}
            >
              {number(matured ? account.expectedPayout : account.principal)}골드{' '}
              {matured ? '받기' : '돌려받기'}
            </Button>
          ) : (
            <Button className="min-h-12 w-full rounded-xl text-xs" variant="secondary" disabled>
              {full ? '만기를 기다리는 중' : '다음 납입 대기 중'}
            </Button>
          )}
        </div>
      </section>
      <details className="group rounded-xl border border-border/60 bg-background">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          적금 정보
          <ChevronDown
            aria-hidden="true"
            className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-border/50 px-4 pb-3 pt-4">
          <p className="mb-4 text-[11px] leading-5 text-muted-foreground">가입 순간 장착한 유물의 효과가 적용돼요. 가입 후 유물을 바꿔도 해당 적금의 효과는 유지돼요.</p>
          <dl className="space-y-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">매일 납입</dt>
              <dd>{number(account.daily_amount)}골드</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">총 납입 예정 원금</dt>
              <dd>{number(account.daily_amount * account.term_days)}골드</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">만기</dt>
              <dd>{date(account.maturesAt)}</dd>
            </div>
            {!missed && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">만기 보너스</dt>
                <dd className="text-primary">+{number(account.expectedBonus)}골드</dd>
              </div>
            )}
          </dl>
          {!matured && !missed && (
            <div className="mt-4 border-t border-border/50 pt-2">
              <Button
                variant="ghost"
                className="min-h-11 w-full text-[11px] text-muted-foreground"
                disabled={disabled}
                onClick={onCancel}
              >
                중도 해지
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">
                중도 해지하면 보너스 없이 원금만 돌려받아요.
              </p>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}

export function SavingsHistory({ items }: { items: SavingsAccount[] }) {
  if (!items.length) return null
  return (
    <details className="group rounded-xl border border-border/60 bg-background">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span>
          최근 저금 기록{' '}
          <span className="ml-1 text-[10px] font-normal tabular-nums text-muted-foreground">
            {items.length}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="divide-y divide-border/50 border-t border-border/50 px-4">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <Shell aria-hidden="true" className="size-5 shrink-0 text-primary/50" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px]">
                {item.term_days}일 적금 ·{' '}
                {item.close_kind === 'matured'
                  ? '만기 수령'
                  : item.close_kind === 'missed'
                    ? '미납 종료'
                    : '중도 해지'}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {item.closed_at && date(item.closed_at)}
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums">+{number(item.payout ?? 0)}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
