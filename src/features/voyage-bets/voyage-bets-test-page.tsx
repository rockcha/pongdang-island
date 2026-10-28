import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useOperator } from '@/features/notices/use-operator'
import { useAccountResource } from '@/lib/account-query'
import { Button } from '@/components/ui/button'
import { VoyageBetsView } from './voyage-bets-view'
import {
  readVoyageTestSample,
  voyageTestProjection,
  voyageTestSteps,
  type VoyageTestBet,
  type VoyageTestPhase,
  type VoyageTestSample,
} from './voyage-test-api'
export function VoyageBetsTestPage() {
  const { session } = useAuth(),
    { operator, loading } = useOperator()
  if (loading)
    return (
      <p role="status" className="p-6 text-xs text-muted-foreground">
        운영자 권한을 확인하고 있어요…
      </p>
    )
  if (!operator)
    return (
      <p role="alert" className="p-6 text-sm">
        운영자 전용 페이지예요.
      </p>
    )
  return <OperatorTest key={session?.user.id} />
}
function OperatorTest() {
  const query = useAccountResource('voyage-race-test-sample', readVoyageTestSample, {
    staleTime: Infinity,
  })
  if (!query.data)
    return (
      <div className="voyage-loading">
        <h1>만선 승부장 테스트</h1>
        {query.isError ? (
          <>
            <p role="alert">테스트 항차를 불러오지 못했어요.</p>
            <Button
              onClick={() => {
                void query.refetch()
              }}
            >
              다시 시도
            </Button>
          </>
        ) : (
          <p role="status">테스트 항차를 준비하고 있어요…</p>
        )}
      </div>
    )
  return (
    <VoyageTestBoard
      key={query.data.open.rounds[0].id}
      sample={query.data}
      busy={query.isFetching}
      error={query.isError}
      onNew={() => {
        void query.refetch({ cancelRefetch: false })
      }}
    />
  )
}
export function VoyageTestBoard({
  sample,
  busy = false,
  error = false,
  onNew,
}: {
  sample: VoyageTestSample
  busy?: boolean
  error?: boolean
  onNew: () => void
}) {
  const [phase, setPhase] = useState<VoyageTestPhase>('open'),
    [bet, setBet] = useState<VoyageTestBet | null>(null)
  const { gold, storedGold, data } = voyageTestProjection(sample, phase, bet),
    index = voyageTestSteps.findIndex((s) => s.id === phase)
  return (
    <div className="voyage-test-page">
      <section className="voyage-test-tools" aria-label="운영자 테스트 도구">
        <div className="voyage-test-title">
          <h2>만선 승부장 테스트</h2>
          <span>테스트 골드 {gold.toLocaleString('ko-KR')}</span>
          {storedGold > 0 && <span>테스트 보관함 {storedGold.toLocaleString('ko-KR')}골드</span>}
        </div>
        <p>실제 골드·항차·알림에는 영향을 주지 않아요.</p>
        <div className="voyage-test-steps" aria-label="테스트 시간 선택">
          {voyageTestSteps.map((step) => (
            <button
              key={step.id}
              aria-pressed={phase === step.id}
              onClick={() => setPhase(step.id)}
              disabled={busy}
            >
              {step.label}
            </button>
          ))}
        </div>
        <div className="voyage-test-actions">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || index === voyageTestSteps.length - 1}
            onClick={() => setPhase(voyageTestSteps[index + 1].id)}
          >
            다음 단계 →
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onNew}>
            {busy ? '새 항차 준비 중…' : '새 항차 뽑기'}
          </Button>
        </div>
        {error && <p role="alert">새 항차를 불러오지 못했어요. 현재 테스트는 유지돼요.</p>}
      </section>
      <VoyageBetsView
        preview
        key={sample.open.rounds[0].id + ':' + phase}
        data={data}
        now={Date.parse(data.serverNow)}
        busy={busy}
        onRefresh={onNew}
        onBet={async (plan, stake) => {
          if (phase !== 'open' || busy || stake < 0 || stake > data.roundLimit || stake % 100 !== 0)
            return false
          setBet(stake === 0 ? null : { planId: plan.id, stake })
          return true
        }}
      />
    </div>
  )
}
