import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { useAccountResource } from '@/lib/account-query'
import { useAppClock } from '@/lib/app-clock'
import { randomId } from '@/lib/random-id'
import { Button } from '@/components/ui/button'
import {
  isVoyageRejection,
  placeVoyageBet,
  readVoyageBets,
  voyageError,
  type VoyageBetRequest,
  type VoyagePlan,
} from './api'
import { VoyageBetsView } from './voyage-bets-view'
import { VoyagePushToggle } from './voyage-push-toggle'
import { voyagePhase, voyageCompletedRegions } from './time'
export function VoyageBetsPage() {
  const { session } = useAuth()
  return <AccountVoyages key={session?.user.id ?? 'guest'} />
}
function AccountVoyages() {
  // Refresh claim status when returning from the reward mailbox.
  const query = useAccountResource('voyage-bets', readVoyageBets, { staleTime: 0 }),
    clock = useAppClock()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uncertain, setUncertain] = useState(false)
  const pending = useRef<VoyageBetRequest | null>(null),
    lock = useRef(false),
    phaseKey = useRef(''),
    paidKey = useRef<string | null>(null)
  const now = query.data
    ? Date.parse(query.data.serverNow) + Math.max(0, clock - query.dataUpdatedAt)
    : clock
  const phases =
    query.data?.rounds
      .map((r) => r.id + ':' + voyagePhase(r, now) + ':' + voyageCompletedRegions(r, now))
      .join('|') ?? ''
  useEffect(() => {
    if (phaseKey.current && phases && phaseKey.current !== phases)
      void query.refetch({ cancelRefetch: false })
    phaseKey.current = phases
  }, [phases, query.refetch])
  const payouts = query.data?.rounds.map((r) => r.myBet?.paidAt ?? '').join('|') ?? ''
  useEffect(() => {
    if (!query.data) return
    if (paidKey.current !== null && paidKey.current !== payouts)
      window.dispatchEvent(new Event('wallet-changed'))
    paidKey.current = payouts
  }, [payouts, !!query.data])
  async function execute(request: VoyageBetRequest) {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await placeVoyageBet(request)
      pending.current = null
      setUncertain(false)
      toast.success(request.p_stake === 0 ? '참가금을 반환했어요.' : '예측을 저장했어요.')
      return true
    } catch (cause) {
      setError(voyageError(cause))
      if (isVoyageRejection(cause)) {
        pending.current = null
        setUncertain(false)
        void query.refetch({ cancelRefetch: false })
      } else setUncertain(true)
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function bet(plan: VoyagePlan, stake: number) {
    if (pending.current) return false
    const request = { p_operation_id: randomId(), p_plan_id: plan.id, p_stake: stake }
    pending.current = request
    return execute(request)
  }
  if (!query.data)
    return (
      <div className="voyage-loading">
        {query.isError ? (
          <>
            <p role="alert">출항 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
            <Button
              variant="secondary"
              onClick={() => {
                void query.refetch()
              }}
            >
              다시 시도
            </Button>
          </>
        ) : (
          <>
            <p role="status">네 선단의 출항 계획을 확인하고 있어요…</p>
            <div className="voyage-loading-cards">
              {[0, 1, 2, 3].map((n) => (
                <div key={n} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  return (
    <VoyageBetsView
      data={query.data}
      now={now}
      busy={busy}
      error={error}
      uncertain={uncertain}
      onBet={bet}
      onRefresh={() => {
        void query.refetch({ cancelRefetch: false })
      }}
      onRetry={() => {
        if (pending.current) void execute(pending.current)
      }}
      alertControl={<VoyagePushToggle />}
    />
  )
}
