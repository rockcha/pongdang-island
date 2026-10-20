import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { GoldChange } from '@/features/gold/gold-change'
import { randomId } from '@/lib/random-id'
import { GameModal } from './game-modal'
import { GameStartOverlay } from './game-start-overlay'
import { GameActions, GameStage, GamePanel } from './game-layout'
import { GameTabs, type GameTab } from './game-controls'
import { LadderRanking } from './ladder-ranking'
import { LadderBoard } from './ladder-board'
import { LadderResult } from './ladder-result'
import {
  LADDER_REVEAL_MS,
  ladderModes,
  practiceLadder,
  type LadderBet,
  type LadderMode,
  type LadderRun,
} from './ladder-model'
import { ladderError, playLadder } from './ladder-api'
import './ladder-game.css'

function readPending(key: string): LadderBet | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null')
    return value &&
      typeof value.operation === 'string' &&
      value.mode in ladderModes &&
      Number.isInteger(value.stake) &&
      value.stake >= 20 &&
      value.stake <= 1000 &&
      value.stake % 20 === 0 &&
      Number.isInteger(value.choice) &&
      value.choice >= 0 &&
      value.choice < 4
      ? value
      : null
  } catch {
    return null
  }
}
export default function LadderGame() {
  const { session } = useAuth()
  return <AccountLadder key={session?.user.id ?? 'guest'} account={session?.user.id ?? 'guest'} />
}
function AccountLadder({ account }: { account: string }) {
  const key = `pongdang:ladder-pending:${account}`
  const gold = useGold()
  const [tab, setTab] = useState<GameTab>('game')
  const [mode, setMode] = useState<LadderMode>('calm')
  const [stake, setStake] = useState(20)
  const [choice, setChoice] = useState<number | null>(null)
  const [practice, setPractice] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'setup' | 'stake' | 'select' | 'reveal' | 'result'>('setup')
  const [run, setRun] = useState<LadderRun | null>(null)
  const [goldEffect, setGoldEffect] = useState<{ id: string; amount: number } | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<LadderBet | null>(() => readPending(key))
  const locked = useRef(false),
    alive = useRef(true)
  useEffect(() => {
    if (!goldEffect) return
    const timer = setTimeout(() => setGoldEffect(null), 1400)
    return () => clearTimeout(timer)
  }, [goldEffect])
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    if (!pending) return
    setMode(pending.mode)
    setStake(pending.stake)
    setChoice(pending.choice)
    setPhase('select')
    setOpen(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'reveal') return
    const timer = setTimeout(
      () => {
        setPhase('result')
        if (!practice) {
          if (run) setGoldEffect({ id: `${run.id}:payout`, amount: run.reward })
          void gold.refresh()
        }
      },
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : LADDER_REVEAL_MS,
    )
    return () => clearTimeout(timer)
  }, [phase, practice]) // eslint-disable-line react-hooks/exhaustive-deps
  const config = ladderModes[mode]
  const valid = Number.isInteger(stake) && stake >= 20 && stake <= 1000 && stake % 20 === 0
  function begin(isPractice: boolean) {
    if (pending) {
      setPractice(false)
      setMode(pending.mode)
      setStake(pending.stake)
      setChoice(pending.choice)
      setPhase('select')
      setOpen(true)
      return
    }
    setPractice(isPractice)
    setGoldEffect(null)
    setChoice(null)
    setRun(null)
    setPhase('setup')
    setError('')
    setOpen(true)
  }
  async function play() {
    if (locked.current || phase !== 'select' || (!pending && (!valid || choice === null))) return
    const bet = pending ?? { operation: randomId(), mode, stake, choice: choice! }
    locked.current = true
    setBusy(true)
    setError('')
    try {
      if (!practice && !pending) {
        // Persist before sending: uncertain network responses must reuse this operation.
        localStorage.setItem(key, JSON.stringify(bet))
        setPending(bet)
      }
      const next = practice ? practiceLadder(bet) : await playLadder(bet)
      if (!alive.current) return
      setRun(next)
      if (!practice) setGoldEffect({ id: `${next.id}:stake`, amount: -next.stake })
      setPhase('reveal')
      setPending(null)
      try {
        localStorage.removeItem(key)
      } catch {
        /* A persisted retry remains idempotent. */
      }
    } catch (cause) {
      if (alive.current) {
        const message = String((cause as { message?: string })?.message ?? '')
        if (
          message.includes('INSUFFICIENT_GOLD') ||
          message.includes('GOLD_LIMIT') ||
          message.includes('INVALID_LADDER_REQUEST')
        ) {
          setPending(null)
          try {
            localStorage.removeItem(key)
          } catch {
            /* No money moved. */
          }
        }
        setError(ladderError(cause))
      }
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <GameTabs id="ladder" value={tab} onChange={setTab} />
      {tab === 'rank' ? <LadderRanking /> : null}
      <GamePanel id="ladder" hidden={tab !== 'game'}>
        <GameModal
          open={open}
          title="퐁이의 물결 사다리"
          active={phase === 'reveal' || !!pending}
          practice={practice}
          busy={busy}
          exitDescription="결과는 서버에 보관돼요. 나가도 이미 확정된 베팅과 지급은 취소되지 않아요."
          onExit={() => {
            setOpen(false)
            setGoldEffect(null)
            if (!practice && run) void gold.refresh()
          }}
        >
          {!open ? (
            <GameStage>
              <GameStartOverlay
                title="퐁이의 물결 사다리"
                description="네 갈래 물결 중 하나를 골라, 조개 속 행운을 만나보세요."
                poster="/arcade/ladder/thumbnail.jpg"
                fee={0}
                compactFreeLabel
                onPaid={() => begin(false)}
                onPractice={() => begin(true)}
                paidDisabled={!!pending}
                practiceDisabled={!!pending}
                extraPanel={
                  pending ? (
                    <Button
                      variant="outline"
                      className="min-h-12 w-full"
                      onClick={() => begin(false)}
                    >
                      미확인 베팅 이어서 확인
                    </Button>
                  ) : undefined
                }
                rules={[
                  '물결과 금액을 고르고 네 사다리 중 하나를 선택해요.',
                  '배당은 원금을 포함해요. 평균 지급률은 세 물결 모두 100%예요.',
                  '연습에서는 실제 골드를 사용하거나 지급하지 않아요.',
                ]}
              />
            </GameStage>
          ) : (
            <div className="ladder-game relative flex min-h-0 flex-1 flex-col">
              {goldEffect && (
                <div
                  key={goldEffect.id}
                  className="ladder-gold-effect"
                  role="status"
                  aria-label={`${goldEffect.amount < 0 ? '베팅' : '지급'} ${Math.abs(goldEffect.amount)}골드`}
                >
                  <GoldChange delta={goldEffect.amount} />
                </div>
              )}
              <ol className="ladder-progress" aria-label="게임 진행 단계">
                {['물결', '금액', '조개', '결과'].map((label, i) => {
                  const current =
                    phase === 'setup' ? 0 : phase === 'stake' ? 1 : phase === 'result' ? 3 : 2
                  return (
                    <li key={label} aria-current={current === i ? 'step' : undefined}>
                      <span />
                      {label}
                    </li>
                  )
                })}
              </ol>
              <div
                key={phase === 'setup' || phase === 'stake' ? phase : 'board'}
                className={`ladder-scroll ladder-step-screen ${phase === 'setup' ? 'ladder-mode-screen' : ''} min-h-0 flex-1 overflow-y-auto overscroll-contain`}
              >
                <div className="ladder-intro">
                  {phase !== 'setup' && !pending && (
                    <button
                      type="button"
                      className="ladder-step-back"
                      style={{
                        visibility: phase === 'reveal' || phase === 'result' ? 'hidden' : undefined,
                      }}
                      disabled={busy || phase === 'reveal' || phase === 'result'}
                      onClick={() => {
                        setPhase(phase === 'stake' ? 'setup' : 'stake')
                        setError('')
                      }}
                    >
                      <ArrowLeft className="size-4" />
                      이전
                    </button>
                  )}
                  <span>
                    {phase === 'setup'
                      ? '어떤 물결을 탈까요?'
                      : phase === 'stake'
                        ? '얼마를 걸고 떠날까요?'
                        : phase === 'select'
                          ? '출발할 조개를 골라요'
                          : phase === 'reveal'
                            ? '행운을 따라가는 중…'
                            : '조개가 열렸어요'}
                  </span>
                  <p hidden={phase === 'stake'}>
                    {phase === 'setup'
                      ? '물결마다 보상의 크기가 달라요.'
                      : phase === 'result'
                        ? config.name
                        : `${config.name} · ${stake}골드${practice ? ' · 연습' : ''}`}
                  </p>
                </div>
                {phase === 'setup' && (
                  <fieldset disabled={busy || !!pending} className="ladder-settings">
                    <legend className="sr-only">물결 선택</legend>
                    <div role="group" aria-label="물결 유형" className="ladder-modes">
                      {(Object.keys(ladderModes) as LadderMode[]).map((id) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={mode === id}
                          onClick={() => setMode(id)}
                        >
                          <img
                            src={`/arcade/ladder/mode-${id}.png`}
                            alt=""
                            width="80"
                            height="80"
                          />
                          <span>
                            {id === 'calm'
                              ? '잔잔한 물결'
                              : id === 'wave'
                                ? '출렁이는 파도'
                                : '거친 폭풍'}
                            <small>{ladderModes[id].detail}</small>
                          </span>
                          <span className="ladder-payout-preview">
                            <span className="ladder-payout-grid">
                              {ladderModes[id].payouts.map((p, i) => (
                                <span
                                  key={i}
                                  className={
                                    p === 0
                                      ? 'ladder-payout-zero'
                                      : p > 100
                                        ? 'ladder-payout-profit'
                                        : ''
                                  }
                                >
                                  <strong>×{p / 100}</strong>
                                </span>
                              ))}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {phase === 'stake' && (
                  <fieldset
                    disabled={busy || !!pending}
                    className="ladder-settings ladder-stake-settings"
                  >
                    <legend className="sr-only">베팅금 선택</legend>
                    <div className="ladder-selected-mode">
                      <img src={`/arcade/ladder/mode-${mode}.png`} alt="" width="64" height="64" />
                      <span>
                        {config.name}
                        <small>{config.detail}</small>
                      </span>
                    </div>
                    <div className="ladder-bet">
                      <label htmlFor="ladder-stake">베팅금</label>
                      <div>
                        <button
                          type="button"
                          aria-label="베팅금 20골드 줄이기"
                          disabled={stake <= 20}
                          onClick={() => setStake((n) => Math.max(20, n - 20))}
                        >
                          −
                        </button>
                        <GoldIcon className="size-5" />
                        <input
                          id="ladder-stake"
                          type="number"
                          inputMode="numeric"
                          min="20"
                          max="1000"
                          step="20"
                          value={stake}
                          readOnly
                        />
                        <button
                          type="button"
                          aria-label="베팅금 20골드 늘리기"
                          disabled={stake >= 1000}
                          onClick={() => setStake((n) => Math.min(1000, n + 20))}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="ladder-stake-limit">20골드 단위 · 최대 1,000골드</p>
                    <div className="ladder-presets">
                      {[20, 100, 200, 500].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={stake === n}
                          onClick={() => setStake(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="ladder-payout-preview ladder-stake-payouts" aria-live="polite">
                      <p className="ladder-payout-heading">예상 보상</p>
                      <div className="ladder-payout-grid">
                        {config.payouts.map((p, i) => (
                          <div
                            key={i}
                            className={
                              p === 0 ? 'ladder-payout-zero' : p > 100 ? 'ladder-payout-profit' : ''
                            }
                          >
                            <span>×{p / 100}</span>
                            <strong>
                              <GoldIcon className="size-3.5" />
                              {(stake * p) / 100}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </fieldset>
                )}
                {(phase === 'select' || phase === 'reveal' || phase === 'result') && (
                  <LadderBoard
                    mode={mode}
                    choice={choice}
                    run={run}
                    revealing={phase === 'reveal'}
                    finished={phase === 'result'}
                    onChoice={setChoice}
                    disabled={busy || !!pending || phase !== 'select'}
                    hidePaths={phase === 'select'}
                  />
                )}
                {error && (
                  <p role="alert" className="px-4 pb-3 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <GameActions className="ladder-actions" revealed={phase !== 'reveal'}>
                {phase === 'result' && run && <LadderResult run={run} />}
                {phase === 'select' && (
                  <p className="ladder-selection-summary">
                    {choice === null
                      ? '위의 조개 네 개 중 하나를 눌러주세요'
                      : `${choice + 1}번 조개 · ${stake}골드${practice ? ' · 연습' : ''}`}
                  </p>
                )}
                {phase === 'setup' || phase === 'stake' ? (
                  <Button
                    className="min-h-12 w-full"
                    disabled={!valid || busy}
                    onClick={() => {
                      setPhase(phase === 'setup' ? 'stake' : 'select')
                      setError('')
                    }}
                  >
                    {phase === 'setup' ? '금액 정하기' : '조개 고르기'}
                    <ArrowRight className="size-4" />
                  </Button>
                ) : phase === 'result' ? (
                  <Button
                    className="min-h-12 w-full"
                    onClick={() => {
                      setOpen(false)
                      setGoldEffect(null)
                      if (!practice) void gold.refresh()
                    }}
                  >
                    나가기
                  </Button>
                ) : (
                  <Button
                    className="min-h-12 w-full"
                    disabled={
                      busy ||
                      (!pending &&
                        (!valid || choice === null || (!practice && gold.wallet.gold < stake)))
                    }
                    onClick={() => void play()}
                  >
                    {busy ? (
                      '결과를 준비하고 있어요…'
                    ) : pending ? (
                      '이전 베팅 결과 확인'
                    ) : choice === null ? (
                      '조개를 선택해주세요'
                    ) : (
                      <>
                        <ArrowDown className="size-4" />
                        {practice ? (
                          '연습으로 출발'
                        ) : (
                          <>
                            <GoldIcon className="size-4" />
                            {stake} 걸고 출발
                          </>
                        )}
                      </>
                    )}
                  </Button>
                )}
              </GameActions>
            </div>
          )}
        </GameModal>
      </GamePanel>
    </div>
  )
}
