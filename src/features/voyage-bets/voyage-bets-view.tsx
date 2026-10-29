import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Check, ChevronDown, Coins, Info, MapPin, RefreshCw, Ship } from 'lucide-react'
import { Select } from '@base-ui/react/select'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LandscapeImage } from '@/components/landscape-image'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import { GoldIcon } from '@/features/gold/gold-provider'
import { regionIcons } from '@/features/regions/region-icons'
import baitArtwork from './bait-artwork.json'
import type { VoyageCatch, VoyageCompany, VoyagePlan, VoyageRound, VoyageState } from './api'
import { voyageCountdown, voyageKoreaDate, voyageKoreaTime, voyagePhase } from './time'
import './voyage-bets.css'
const number = (n: number) => n.toLocaleString('ko-KR')
const phases = {
  scheduled: '접수 대기',
  open: '예측 접수 중',
  sailing: '조업 중',
  settling: '정산 중',
  settled: '정산 완료',
}
const hour = (round: VoyageRound, n: number) =>
  new Date(Date.parse(round.departsAt) + n * 3600000).toISOString()
type Props = {
  data: VoyageState
  now: number
  busy?: boolean
  error?: string
  uncertain?: boolean
  alertControl?: ReactNode
  preview?: boolean
  onBet: (plan: VoyagePlan, stake: number) => Promise<boolean>
  onRefresh: () => void
  onRetry?: () => void
}
export function VoyageBetsView({
  data,
  now,
  busy = false,
  error = '',
  uncertain = false,
  alertControl,
  preview = false,
  onBet,
  onRefresh,
  onRetry,
}: Props) {
  const [tab, setTab] = useState<'current' | 'history'>('current'),
    [historyId, setHistoryId] = useState('')
  const [selected, setSelected] = useState<string | null>(null),
    [details, setDetails] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const sorted = [...data.rounds].sort((a, b) => Date.parse(a.departsAt) - Date.parse(b.departsAt))
  const active =
    sorted.find((r) => ['open', 'sailing'].includes(voyagePhase(r, now))) ??
    sorted.find((r) => voyagePhase(r, now) === 'settling') ??
    sorted.find((r) => voyagePhase(r, now) === 'scheduled') ??
    sorted.at(-1)
  const history = sorted.filter((r) => Date.parse(r.resultsAt) <= now).reverse()
  const round = tab === 'current' ? active : (history.find((r) => r.id === historyId) ?? history[0])
  const phase = round ? voyagePhase(round, now) : 'scheduled'
  const company = (id: string) => data.companies.find((c) => c.id === id)!
  const selectedPlan = round?.plans.find((p) => p.id === selected)
  const detailPlan = round?.plans.find((p) => p.id === details)
  const racing = round && ['sailing', 'settling', 'settled'].includes(phase)
  const leaderboard = round
    ? [...round.plans].sort(
        (a, b) =>
          (a.progress?.rank ?? 5) - (b.progress?.rank ?? 5) ||
          data.companies.findIndex((c) => c.id === a.companyId) -
            data.companies.findIndex((c) => c.id === b.companyId),
      )
    : []
  async function submit(stake: number) {
    if (selectedPlan && (await onBet(selectedPlan, stake))) setSelected(null)
  }
  return (
    <div className="voyage-page">
      <div className="voyage-toolbar">
        <div className="voyage-tabs segmented-control" aria-label="출항 목록">
          <button
            aria-pressed={tab === 'current'}
            onClick={() => {
              setTab('current')
              setSelected(null)
              setDetails(null)
            }}
          >
            이번 출항
          </button>
          <button
            aria-pressed={tab === 'history'}
            onClick={() => {
              setTab('history')
              setSelected(null)
              setDetails(null)
            }}
          >
            지난 결과
          </button>
        </div>
      </div>
      <main className="voyage-content">
        <header className="voyage-guide">
          <p>가장 높은 <strong className="font-semibold">수익률</strong>이 기대되는 회사를 선택해주세요.</p>
          <div className="voyage-guide-actions">
            <Button
              variant="ghost"
              size="sm"
              className="voyage-help-button"
              aria-label="만선 승부장 이용 안내"
              onClick={() => setHelpOpen(true)}
            >
              <Info size={14} />
              이용 안내
            </Button>
            {alertControl}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={onRefresh}
                    disabled={busy}
                    aria-label="출항 정보 새로고침"
                  />
                }
              >
                <RefreshCw size={16} />
              </TooltipTrigger>
              <TooltipContent>출항 정보 새로고침</TooltipContent>
            </Tooltip>
          </div>
        </header>
        {uncertain && (
          <div className="voyage-message" role="alert">
            <p>{error}</p>
            <Button variant="secondary" disabled={busy} onClick={onRetry}>
              {busy ? '확인 중…' : '같은 요청 다시 확인'}
            </Button>
          </div>
        )}
        {!uncertain && error && !selected && (
          <p className="voyage-error" role="alert">
            {error}
          </p>
        )}
        {data.pendingPayout > 0 && (
          <p className="voyage-message">
            <Coins size={15} /> 보유 한도로 {number(data.pendingPayout)}골드가 지급 대기 중이에요.
            골드를 사용하면 다시 받을 수 있어요.
          </p>
        )}
        {tab === 'history' && history.length > 0 && (
          <HistorySelect rounds={history} value={round?.id ?? ''} onChange={setHistoryId} />
        )}
        {round ? (
          <>
            <div className="voyage-sticky-status">
              <RoundStatus round={round} now={now} companies={data.companies} preview={preview} />
            </div>
            {racing ? (
              <ol
                className="voyage-leaderboard"
                aria-label={round.completedRegions === 3 ? '최종 회사 순위' : '현재 회사 순위'}
              >
                {leaderboard.map((plan) => {
                  const c = company(plan.companyId),
                    mine = plan.id === round.myBet?.planId
                  return (
                    <li key={plan.id}>
                      <button
                        className={'voyage-ranking-row' + (mine ? ' voyage-ranking-mine' : '')}
                        onClick={() => setDetails(plan.id)}
                        aria-label={c.name + ' 어획 상세'}
                      >
                        <span className="voyage-rank-number">
                          {plan.progress ? `${plan.progress.rank}` : '–'}
                        </span>
                        <span className="voyage-rank-image">
                          <LandscapeImage
                            src={c.banner.replace(/\.png$/, '.webp')}
                            alt=""
                            width={48}
                            height={40}
                          />
                        </span>
                        <span className="voyage-rank-company">
                          <strong>{c.name}</strong>
                          <small>
                            {mine ? `내 선택 · ${number(round.myBet!.stake)}골드 참여` : c.style}
                            {plan.progress?.tied ? ' · 공동 순위' : ''}
                          </small>
                        </span>
                        <span className="voyage-rank-score">
                          {plan.progress ? (
                            <>
                              <strong
                                aria-label={'수익률 ' + number(plan.progress.achievement) + '%'}
                              >
                                <span className="voyage-score-label">수익률</span>
                                {number(plan.progress.achievement)}%
                              </strong>
                              <small>{number(plan.progress.sales)}골드</small>
                            </>
                          ) : (
                            <small>첫 해역 조업 중</small>
                          )}
                        </span>
                        {mine && round.myBet?.payout !== null && round.myBet && (
                          <span className="voyage-row-settlement">
                            {round.myBet.rewardGiftId
                              ? round.myBet.rewardClaimedAt
                                ? '수령 완료'
                                : '보관함'
                              : round.refunded
                                ? '원금 반환'
                                : round.myBet.paidAt
                                  ? '지급'
                                  : '지급 대기'}{' '}
                            {number(round.myBet.payout)}골드 · 순손익{' '}
                            {round.myBet.payout - round.myBet.stake >= 0 ? '+' : ''}
                            {number(round.myBet.payout - round.myBet.stake)}골드
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <section className="voyage-grid" aria-label="어업 회사 네 곳">
                {data.companies.map((c) => {
                  const plan = round.plans.find((p) => p.companyId === c.id)
                  return plan ? (
                    <CompanyCard
                      key={plan.id}
                      company={c}
                      plan={plan}
                      revealed={phase === 'open' && !!plan.bait}
                      mine={plan.id === round.myBet?.planId}
                      stake={round.myBet?.stake ?? 0}
                      blocked={busy || uncertain}
                      onChoose={() => setSelected(plan.id)}
                    />
                  ) : null
                })}
              </section>
            )}
            {round.refunded && (
              <p className="voyage-message">
                1·2위 보상 순위에 정확한 동률이 있어 이 회차는 참가금 전액을 반환해요.
              </p>
            )}
          </>
        ) : (
          <section className="voyage-empty">
            <Ship size={30} />
            <h2>
              {tab === 'history' ? '아직 발표된 항차가 없어요' : '다음 출항을 준비하고 있어요'}
            </h2>
            <p>잠시 후 다시 확인해 주세요.</p>
            <Button variant="secondary" onClick={onRefresh}>
              다시 확인
            </Button>
          </section>
        )}
      </main>
      {selectedPlan && round && (
        <BetDialog
          key={selectedPlan.id}
          company={company(selectedPlan.companyId)}
          round={round}
          busy={busy}
          blocked={uncertain || phase !== 'open'}
          error={error}
          onClose={() => setSelected(null)}
          onSubmit={submit}
        />
      )}
      <Dialog
        open={!!detailPlan}
        onOpenChange={(open) => {
          if (!open) setDetails(null)
        }}
      >
        <DialogContent className="voyage-result-dialog">
          <DialogHeader>
            <DialogTitle>
              {detailPlan ? company(detailPlan.companyId).name : ''} 어획 현황
            </DialogTitle>
            <DialogDescription>
              완료된 해역만 공개돼요. 남은 해역은 공개 시간까지 비공개예요.
            </DialogDescription>
          </DialogHeader>
          {detailPlan && round && <PlanDetails plan={detailPlan} round={round} />}
        </DialogContent>
      </Dialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="voyage-result-dialog voyage-help-dialog">
          <DialogHeader>
            <DialogTitle>만선 승부장 이용 안내</DialogTitle>
            <DialogDescription>회사 한 곳을 골라 최종 성과 순위를 예측해요.</DialogDescription>
          </DialogHeader>
          <section>
            <h3>참여 방법</h3>
            <ol>
              <li>출항 1시간 전, 미끼·조업 횟수·첫 해역을 확인해요.</li>
              <li>회사 한 곳에 100골드 단위로 최대 {number(data.roundLimit)}골드까지 참여해요.</li>
              <li>
                출항 전까지 회사·금액을 바꾸거나 취소할 수 있어요. 다른 회사를 고르면 기존 선택이
                교체돼요.
              </li>
            </ol>
          </section>
          <section>
            <h3>한 시간마다 해역 하나씩 공개</h3>
            <div className="voyage-help-schedule">
              <table>
                <thead>
                  <tr>
                    <th>출항</th>
                    <th>첫 해역</th>
                    <th>두 번째</th>
                    <th>최종 정산</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>09:00</td>
                    <td>10:00</td>
                    <td>11:00</td>
                    <td>12:00</td>
                  </tr>
                  <tr>
                    <td>20:00</td>
                    <td>21:00</td>
                    <td>22:00</td>
                    <td>23:00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              서로 다른 세 해역에서 각각 표시된 횟수만큼 조업해요. 해역 이름·어획·판매액은 완료
              시각에 공개돼요.
            </p>
          </section>
          <section>
            <h3>순위와 보상</h3>
            <div className="voyage-help-rewards">
              <div>
                <span>1등</span>
                <strong>{data.firstMultiplier}배</strong>
              </div>
              <div>
                <span>2등</span>
                <strong>{data.secondMultiplier}배</strong>
              </div>
              <div>
                <span>3·4등</span>
                <strong>지급 없음</strong>
              </div>
            </div>
            <p>
              보상은 원금 포함이며 최종 정산 후 보관함에 도착해요. 직접 수령하면 보유 골드에
              더해져요.
            </p>
            <p>
              수익률은 미끼·조업 횟수 차이를 보정한 기준 실적 대비 판매액이에요. 100%가 기준이며,
              수익률이 높은 회사부터 순위를 정해요. 중간 순위는 바뀔 수 있어요.
            </p>
            <p>
              반올림 전 수치로 비교해 1·2위 보상 순위에 정확한 동률이 있으면 전원 원금을 반환해요.
            </p>
          </section>
          <p className="voyage-help-note">
            회사 어획은 내 보관함에 지급되지 않아요. 종 아이콘으로 출항 전 알림을 설정할 수 있어요.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
function RoundStatus({
  round,
  now,
  companies,
  preview,
}: {
  round: VoyageRound
  now: number
  companies: VoyageCompany[]
  preview: boolean
}) {
  const phase = voyagePhase(round, now),
    stage = round.completedRegions
  const target =
    phase === 'scheduled'
      ? round.opensAt
      : phase === 'open'
        ? round.departsAt
        : stage < 3
          ? round.nextRevealAt
          : null
  const label =
    phase === 'scheduled'
      ? '접수 시작까지'
      : phase === 'open'
        ? '출항까지'
        : stage < 3
          ? '다음 해역 공개까지'
          : ''
  return (
    <section className="voyage-round-status" aria-label="항차 진행 상태" aria-live="off">
      <div className="voyage-clock-panel">
        <div>
          {(phase === 'open' || phase === 'sailing') && (
            <span className="voyage-phase">
              {phases[phase]}
              {phase === 'sailing' ? ` · ${stage}/3해역 완료` : ''}
            </span>
          )}
          <p>{voyageKoreaTime(round.departsAt)} 출항</p>
        </div>
        <div className="voyage-countdown">
          <span>{label}</span>
          {target ? (
            <strong>{voyageCountdown(target, now)}</strong>
          ) : (
            <strong className="voyage-countdown-done">
              {phase === 'settled' ? (
                <>
                  <Check size={18} />
                  정산 완료
                </>
              ) : (
                '정산 중'
              )}
            </strong>
          )}
        </div>
      </div>
      {phase === 'settled' && (
        <SettlementResult round={round} companies={companies} preview={preview} />
      )}
      <ol className="voyage-report-steps" aria-label="해역 공개 진행">
        {[1, 2, 3].map((n) => (
          <li key={n} data-complete={stage >= n}>
            <span>{stage >= n ? <Check size={12} /> : n}</span>
            <div>
              <strong>{n === 1 ? '첫 해역' : n === 2 ? '두 번째' : '마지막'}</strong>
              <small>
                {voyageKoreaTime(hour(round, n))} {stage >= n ? '완료' : '공개'}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
function SettlementResult({
  round,
  companies,
  preview,
}: {
  round: VoyageRound
  companies: VoyageCompany[]
  preview: boolean
}) {
  const bet = round.myBet
  const plan = round.plans.find((p) => p.id === bet?.planId)
  const company = companies.find((c) => c.id === plan?.companyId)
  if (!bet || !plan)
    return (
      <p className="voyage-settlement-empty">
        참여하지 않은 항차예요. 아래에서 최종 순위를 확인해보세요.
      </p>
    )
  const payout = bet.payout
  const stored = !!bet.rewardGiftId
  const claimed = !!bet.rewardClaimedAt
  return (
    <section className="voyage-settlement" aria-label="내 정산 결과">
      <p className="voyage-settlement-company">
        {company?.name} ·{' '}
        {round.refunded
          ? '동률로 원금 반환'
          : `최종 ${plan.result?.rank ?? plan.progress?.rank ?? '–'}등`}
      </p>
      <div className="voyage-settlement-amount">
        <span>
          {payout === null
            ? '정산 처리 중'
            : payout === 0
              ? '이번 보상'
              : claimed
                ? '수령 완료'
                : stored
                  ? '보관함에 도착한 보상'
                  : '정산 보상'}
        </span>
        <strong>
          <GoldIcon className="size-5" />
          {payout === null ? '–' : number(payout)}
        </strong>
      </div>
      <p className="voyage-settlement-breakdown">
        참가금 {number(bet.stake)}골드
        {payout !== null &&
          ` · 순손익 ${payout - bet.stake >= 0 ? '+' : ''}${number(payout - bet.stake)}골드`}
      </p>
      {stored &&
        !claimed &&
        (preview ? (
          <p className="voyage-settlement-note">
            테스트 보관함에 보관됐어요. 실제 골드는 지급되지 않아요.
          </p>
        ) : (
          <Link
            className="voyage-settlement-link"
            to={'/notifications?gift=' + encodeURIComponent(bet.rewardGiftId!)}
          >
            보관함에서 받기 <ChevronDown size={14} className="-rotate-90" />
          </Link>
        ))}
      {!stored && payout !== null && payout > 0 && (
        <p className="voyage-settlement-note">
          {bet.paidAt ? '보유 골드에 지급됐어요.' : '보관함으로 보상을 보내고 있어요.'}
        </p>
      )}
      {payout === 0 && <p className="voyage-settlement-note">3·4등은 지급되는 보상이 없어요.</p>}
    </section>
  )
}
function CompanyCard({
  company,
  plan,
  revealed,
  mine,
  stake,
  blocked,
  onChoose,
}: {
  company: VoyageCompany
  plan: VoyagePlan
  revealed: boolean
  mine: boolean
  stake: number
  blocked: boolean
  onChoose: () => void
}) {
  return (
    <article className="voyage-company" aria-labelledby={'company-' + plan.id}>
      <div className="voyage-company-banner">
        <picture>
          <source srcSet={company.banner.replace(/\.png$/, '.webp')} type="image/webp" />
          <LandscapeImage src={company.banner} alt="" width={2172} height={724} />
        </picture>
        <div className="voyage-company-title">
          <span>{company.style}</span>
          <h2 id={'company-' + plan.id}>{company.name}</h2>
        </div>
      </div>
      <div className="voyage-company-body">
        <p className="voyage-company-description">{company.description}</p>
        {revealed && (
          <>
            <VoyagePlanVisual plan={plan} />
            {mine && (
              <p className="voyage-card-bet">
                <span>내 참가금</span>
                <strong aria-label={number(stake) + '골드'}>
                  <GoldIcon className="size-4" />
                  {number(stake)}
                </strong>
              </p>
            )}
            <div className="voyage-card-footer">
              <Button disabled={blocked} onClick={onChoose}>
                {mine ? '내 선택 수정' : '이 회사 선택'}
                {mine && <Check size={14} />}
              </Button>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
function VoyageRegionArt({ regionId, hidden = false }: { regionId?: string; hidden?: boolean }) {
  const art = regionId ? regionIcons[regionId] : undefined
  if (hidden)
    return (
      <span className="voyage-region-art voyage-region-unknown" aria-hidden="true">
        ?
      </span>
    )
  return art ? (
    <img className="voyage-region-art" src={art.src} alt="" width={32} height={32} />
  ) : (
    <span className="voyage-region-art" aria-hidden="true">
      <MapPin size={24} />
    </span>
  )
}
function VoyagePlanVisual({
  plan,
  showRegions = true,
}: {
  plan: VoyagePlan
  showRegions?: boolean
}) {
  if (!plan.bait) return null
  const image = (baitArtwork as Record<string, string>)[plan.bait.id] ?? '/app-icons/bait.png'
  return (
    <div className="voyage-plan-visual">
      <div className="voyage-bait-summary">
        <div className="voyage-bait-art">
          <LandscapeImage src={image} alt={plan.bait.name} className="size-full object-contain" />
        </div>
        <div className="voyage-bait-name">
          <small>사용 미끼</small>
          <strong>{plan.bait.name}</strong>
        </div>
        <div className="voyage-draw-count">
          <strong>{plan.countPerRegion}회씩</strong>
          <small>
            3개 해역 · <span>총 {(plan.countPerRegion ?? 0) * 3}회</span>
          </small>
        </div>
      </div>
      {showRegions && (
        <ol className="voyage-route" aria-label="해역별 조업 횟수">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <VoyageRegionArt
                regionId={i === 0 ? plan.publicRegion?.id : undefined}
                hidden={i !== 0 || !plan.publicRegion}
              />
              <span className="voyage-route-name">
                {i === 0 ? plan.publicRegion?.name : '미공개 해역'}
              </span>
              <strong>{plan.countPerRegion}회</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
function BetDialog({
  company,
  round,
  busy,
  blocked,
  error,
  onClose,
  onSubmit,
}: {
  company: VoyageCompany
  round: VoyageRound
  busy: boolean
  blocked: boolean
  error: string
  onClose: () => void
  onSubmit: (stake: number) => Promise<void>
}) {
  const [stake, setStake] = useState(round.myBet?.stake ?? 100),
    cancelling = stake === 0
  return (
    <ConfirmDialog
      open
      compact
      title={cancelling ? '이번 항차 참여를 취소할까요?' : company.name + '을 선택할까요?'}
      description={cancelling ? '참가금을 전액 돌려드려요.' : null}
      busy={busy}
      error={error}
      confirmDisabled={blocked || stake > 500 || (!round.myBet && stake === 0)}
      confirmLabel={cancelling ? '취소하고 반환받기' : '선택 확정하기'}
      cancelLabel="닫기"
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onConfirm={() => {
        void onSubmit(stake)
      }}
    >
      <p className="voyage-stake-label">
        참가금<span>회차당 최대 500골드</span>
      </p>
      <div className="voyage-stake-options">
        {[100, 200, 300, 400, 500].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={stake === n}
            disabled={busy || blocked}
            onClick={() => setStake(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {cancelling ? (
        <div className="voyage-bet-summary">
          <span>반환 참가금</span>
          <strong>{number(round.myBet?.stake ?? 0)}골드</strong>
        </div>
      ) : (
        <div className="voyage-reward-preview">
          <p>
            <span>1등일 경우</span>
            <strong aria-label={number(stake * 3) + '골드'}>
              <GoldIcon className="size-4" />
              {number(stake * 3)}
            </strong>
          </p>
          <p>
            <span>2등일 경우</span>
            <strong aria-label={number((stake * 6) / 5) + '골드'}>
              <GoldIcon className="size-4" />
              {number((stake * 6) / 5)}
            </strong>
          </p>
        </div>
      )}
      {round.myBet && (
        <button
          className="voyage-cancel-bet"
          disabled={busy || blocked}
          onClick={() => setStake(0)}
        >
          기존 참여 취소
        </button>
      )}
    </ConfirmDialog>
  )
}
function PlanDetails({ plan, round }: { plan: VoyagePlan; round: VoyageRound }) {
  const progress = plan.progress,
    stage = round.completedRegions
  return (
    <div className="voyage-result-content">
      <VoyagePlanVisual plan={plan} showRegions={false} />
      {progress ? (
        <div className="voyage-result-summary">
          <span>
            {stage === 3 ? '최종' : '현재'} {progress.rank}위{progress.tied ? ' · 공동 순위' : ''}
          </span>
          <strong aria-label={'수익률 ' + number(progress.achievement) + '%'}>
            {number(progress.achievement)}%
          </strong>
          <small>
            누적 판매액 {number(progress.sales)}골드 · {stage}/3해역 완료
            {stage < 3 ? ' · 아직 보상 미확정' : ''}
          </small>
        </div>
      ) : (
        <p className="voyage-reveal-note">첫 해역의 조업 결과를 기다리고 있어요.</p>
      )}
      {[1, 2, 3].map((n) => {
        const region = progress?.regions[n - 1]
        return (
          <section className="voyage-region-results" key={n}>
            <h3>
              <VoyageRegionArt
                regionId={region?.regionId ?? (n === 1 ? plan.publicRegion?.id : undefined)}
                hidden={!region && (n !== 1 || !plan.publicRegion)}
              />
              {region?.regionName ?? (n === 1 ? plan.publicRegion?.name : null) ?? '미공개 해역'}
              <span>
                {region ? number(region.sales) + '골드' : voyageKoreaTime(hour(round, n)) + ' 공개'}
              </span>
            </h3>
            <p className="voyage-region-draws">{plan.countPerRegion}회 조업</p>
            {region && (
              <details className="voyage-plan-details">
                <summary>
                  어획 보기
                  <ChevronDown size={13} />
                </summary>
                <CatchList items={region.catches} />
              </details>
            )}
          </section>
        )
      })}
    </div>
  )
}
function CatchList({ items }: { items: VoyageCatch[] }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <ul className="voyage-catches">
        {(expanded ? items : items.slice(0, 6)).map((item) => (
          <li key={item.id}>
            <CollectibleThumbnail
              path={item.thumbnailPath}
              name={item.name}
              className="size-11 shrink-0"
            />
            <div>
              <strong>{item.name}</strong>
              <small>
                {number(item.price)}골드 × {item.quantity}개
              </small>
            </div>
            <span>{number(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      {items.length > 6 && (
        <button className="voyage-expand-catches" onClick={() => setExpanded(!expanded)}>
          {expanded ? '접기' : items.length + '종 모두 보기'}
        </button>
      )}
    </>
  )
}
function HistorySelect({
  rounds,
  value,
  onChange,
}: {
  rounds: VoyageRound[]
  value: string
  onChange: (id: string) => void
}) {
  const items = rounds.map((r) => ({
    value: r.id,
    label: voyageKoreaDate(r.departsAt) + ' ' + voyageKoreaTime(r.departsAt) + ' 출항',
  }))
  return (
    <Select.Root
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
    >
      <Select.Trigger aria-label="지난 항차 선택" className="voyage-history-select">
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={15} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={5} className="z-[70]">
          <Select.Popup className="min-w-52 rounded-xl border bg-popover p-1 text-xs shadow-sm">
            <Select.List>
              {items.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg px-3 outline-none data-highlighted:bg-secondary"
                >
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
