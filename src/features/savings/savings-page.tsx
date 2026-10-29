import { useCallback, useEffect, useRef, useState } from 'react'
import { Shell, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAuth } from '@/components/auth-provider'
import { useGold } from '@/features/gold/gold-provider'
import { randomId } from '@/lib/random-id'
import { changeSavings, isSavingsRejection, readSavings, savingsError } from './api'
import type { SavingsAction, SavingsResult, SavingsState } from './api'
import { savingsStatus } from './savings-time'
import {
  SavingsAccountPanel,
  SavingsHistory,
  SavingsMoney as Money,
  SavingsPlanPanel,
} from './savings-panels'
import {useAccountState} from '@/lib/account-query'
import './savings.css'

const plans = [
  { days: 3, bonus: 20 },
  { days: 5, bonus: 25 },
  { days: 7, bonus: 30 },
] as const
const number = (n: number) => n.toLocaleString('ko-KR')
function Loading() {
  return (
    <div role="status" aria-label="적금 불러오는 중" className="space-y-4 p-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-28 rounded-2xl bg-secondary/50 motion-safe:animate-pulse"
        />
      ))}
    </div>
  )
}
export function SavingsPage() {
  const { session } = useAuth()
  return <AccountSavings key={session?.user.id ?? 'guest'} />
}
function AccountSavings() {
  const gold = useGold()
  const [data, setData, query] = useAccountState<SavingsState>('savings',readSavings)
  const loadError=query.error?savingsError(query.error):''
  const [error,setError]=useState('')
  const [term, setTerm] = useState<3 | 5 | 7>(3),
    [amount, setAmount] = useState('100'),
    [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'open' | 'withdraw' | null>(null),
    [pending, setPending] = useState<SavingsAction | null>(null)
  const [receipt, setReceipt] = useState<SavingsResult['receipt'] | null>(null)
  const [clock, setClock] = useState<{ server: number; sample: number } | null>(null),
    [tick, setTick] = useState(() => performance.now())
  const alive = useRef(true),
    locked = useRef(false),
    operation = useRef<SavingsAction | null>(null)
  useEffect(() => {
    if(!data)return
    const sample = performance.now()
    setClock({ server: Date.parse(data.serverNow)+Math.max(0,Date.now()-query.dataUpdatedAt), sample })
    setTick(sample)
  }, [data,query.dataUpdatedAt])
  const reload=useCallback(async()=>{if(!locked.current)await query.refetch({cancelRefetch:false})},[query.refetch])
  useEffect(()=>{alive.current=true;const timer=setInterval(()=>setTick(performance.now()),1000);return()=>{alive.current=false;clearInterval(timer)}},[])
  const account = data?.account ?? null,
    now = clock ? clock.server + tick - clock.sample : 0
  const status = account ? savingsStatus(account, now) : null
  const target = account
    ? status === 'due'
      ? account.depositDeadline
      : account.paid_count === account.term_days
        ? account.maturesAt
        : account.nextOpenAt
    : null
  useEffect(() => {
    if (!target || !clock) return
    const delay = Date.parse(target) - (clock.server + performance.now() - clock.sample)
    if (delay < 0) return
    const timer = setTimeout(() => void reload(), Math.max(100, delay + 100))
    return () => clearTimeout(timer)
  }, [target, clock, reload])
  const daily = Number(amount),
    valid = /^\d+$/.test(amount) && Number.isSafeInteger(daily) && daily >= 10 && daily <= 5000
  const plan = plans.find((p) => p.days === term)!,
    principal = valid ? daily * term : 0,
    baseBonus = Math.floor((principal * plan.bonus) / 100),
    relicBonusPercent=data?.relicBonusPercent??0,
    bonus = baseBonus+Math.floor(baseBonus*relicBonusPercent/100)
  async function run(args: Omit<SavingsAction, 'p_operation_id'>) {
    if (locked.current) return
    if (operation.current) {
      const { p_operation_id: _, ...previous } = operation.current
      if (JSON.stringify(previous) !== JSON.stringify(args)) {
        setError('이전 요청의 결과를 먼저 확인해주세요.')
        return
      }
    }
    let shouldReload = false
    locked.current = true
    setBusy(true)
    setError('')
    operation.current ??= { ...args, p_operation_id: randomId() }
    setPending(operation.current)
    try {
      const next = await changeSavings(operation.current)
      if (alive.current) {
        setData(next)
        setConfirm(null)
        setReceipt(next.receipt.action === 'withdraw' ? next.receipt : null)
        operation.current = null
        setPending(null)
        void gold.refresh()
      }
    } catch (e) {
      if (alive.current) {
        setError(savingsError(e))
        if (isSavingsRejection(e)) {
          operation.current = null
          setPending(null)
          shouldReload = true
        }
      }
    } finally {
      locked.current = false
      if (alive.current) {
        setBusy(false)
        if (shouldReload) void reload()
      }
    }
  }
  function retry() {
    if (!operation.current) return
    const { p_operation_id: _, ...args } = operation.current
    void run(args)
  }
  const disabled = busy || pending !== null
  return (
    <section className="flex min-h-0 w-full flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {loadError && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl bg-destructive/5 p-3 text-xs leading-5"
          >
            <p className="flex-1">{loadError}</p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="적금 새로고침"
              onClick={() => void reload()}
            >
              <RotateCw className="size-4" />
            </Button>
          </div>
        )}
        {!data && !loadError ? (
          <Loading />
        ) : (
          data && (
            <>
              {receipt && (
                <div
                  role="status"
                  className="savings-received space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center"
                >
                  <Shell className="mx-auto size-12 text-primary" />
                  <p className="text-sm">
                    {receipt.closeKind === 'matured'
                      ? '조개가 모아둔 선물이에요!'
                      : '맡긴 원금을 돌려받았어요.'}
                  </p>
                  <Money value={receipt.payout} large />
                  {receipt.bonus > 0 && (
                    <p className="text-xs text-primary">
                      만기 보너스 {number(receipt.bonus)}골드 포함
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    className="min-h-11 w-full"
                    onClick={() => setReceipt(null)}
                  >
                    확인
                  </Button>
                </div>
              )}
              {!account ? (
                <SavingsPlanPanel
                  plans={plans}
                  term={term}
                  amount={amount}
                  valid={valid}
                  disabled={disabled}
                  gold={data.gold}
                  principal={principal}
                  bonus={bonus}
                  bonusPercent={plan.bonus}
                  relicBonusPercent={relicBonusPercent}
                  onTerm={setTerm}
                  onAmount={setAmount}
                  onStart={() => {
                    setError('')
                    setConfirm('open')
                  }}
                />
              ) : (
                <SavingsAccountPanel
                  account={account}
                  status={status!}
                  now={now}
                  gold={data.gold}
                  disabled={disabled}
                  onDeposit={() => void run({ p_action: 'deposit', p_account_id: account.id })}
                  onWithdraw={() => void run({ p_action: 'withdraw', p_account_id: account.id })}
                  onCancel={() => {
                    setError('')
                    setConfirm('withdraw')
                  }}
                />
              )}
              {error && (
                <div
                  role="alert"
                  className="space-y-3 rounded-xl bg-destructive/5 p-3 text-xs leading-5 text-destructive"
                >
                  <p>{error}</p>
                  {pending && (
                    <Button
                      variant="outline"
                      className="min-h-11 w-full"
                      disabled={busy}
                      onClick={retry}
                    >
                      이전 요청 결과 다시 확인
                    </Button>
                  )}
                </div>
              )}
              <SavingsHistory items={data.history} />
            </>
          )
        )}
      </div>
      <ConfirmDialog
        illustration="savings"
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null)
        }}
        title={confirm === 'open' ? '조개 적금을 시작할까요?' : '지금 조개를 열까요?'}
        description={
          confirm === 'open'
            ? `매일 ${number(daily)}골드씩 ${term}회 납입해요. 지금 첫 ${number(daily)}골드를 넣고, 가입 ${term}일 후 만기에 ${number(principal + bonus)}골드를 받아요.`
            : `지금 열면 보너스 없이 넣은 원금 ${number(account?.principal ?? 0)}골드만 돌려받아요.`
        }
        busy={busy}
        error={error}
        onConfirm={() =>
          confirm === 'open'
            ? void run({ p_action: 'open', p_term_days: term, p_daily_amount: daily })
            : account && void run({ p_action: 'withdraw', p_account_id: account.id })
        }
      />
    </section>
  )
}
