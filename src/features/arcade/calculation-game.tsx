import { memo, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  RotateCcw,
  Fish,
  CircleCheck,
  CircleX,
  Timer,
} from 'lucide-react'
import { GameModal } from './game-modal'
import { GameStartOverlay } from './game-start-overlay'
import { GameTabs, type GameTab } from './game-controls'
import { GamePanel } from './game-layout'
import countingThumbnail from './assets/calculation/counting-thumbnail.webp'
import {
  CREATURES,
  STAGE_COUNT,
  answerOrder,
  countKind,
  countingReducer,
  createCountingGame,
  swimmerPosition,
  type CountingAction,
  type CountingRound,
} from './calculation-model'
import './calculation-game.css'

const artwork = import.meta.glob<string>('./assets/calculation/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})
function imageUrl(kind: number) {
  return artwork[`./assets/calculation/${CREATURES[kind].id}.png`]
}
function Creature({ kind }: { kind: number }) {
  return (
    <img
      className="count-creature"
      src={imageUrl(kind)}
      alt={CREATURES[kind].name}
      draggable={false}
    />
  )
}
function useArtwork() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    const images: HTMLImageElement[] = []
    Promise.all(
      CREATURES.map(
        (_, kind) =>
          new Promise<void>((resolve, reject) => {
            const url = imageUrl(kind)
            if (!url) {
              reject(new Error('Missing local artwork'))
              return
            }
            const image = new Image()
            images.push(image)
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('Artwork unavailable'))
            image.src = url
          }),
      ),
    ).then(
      () => {
        if (!cancelled) setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('error')
      },
    )
    return () => {
      cancelled = true
      images.forEach((image) => {
        image.onload = null
        image.onerror = null
      })
    }
  }, [attempt])
  return {
    status,
    retry: () => {
      setStatus('loading')
      setAttempt((v) => v + 1)
    },
  }
}

const Aquarium = memo(function Aquarium({
  round,
  moving,
  paused,
  reveal,
}: {
  round: CountingRound
  moving: boolean
  paused: boolean
  reveal: boolean
}) {
  const tank = useRef<HTMLDivElement>(null)
  const nodes = useRef<(HTMLDivElement | null)[]>([])
  const elapsed = useRef(0)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const change = () => setReduced(query.matches)
    change()
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    let frame = 0,
      last = performance.now()
    function draw() {
      const box = tank.current
      if (!box) return
      const width = box.clientWidth,
        height = box.clientHeight
      const size = Math.max(38, Math.min(62, width * 0.17, ((height - 16) / 8) * 1.6))
      round.fish.forEach((fish, i) => {
        const node = nodes.current[i]
        if (!node) return
        const p = swimmerPosition(fish, elapsed.current)
        const x = 8 + p.x * Math.max(0, width - size - 16)
        const y = Math.max(6, Math.min(height - size - 6, 8 + p.y * (height - 16) - size / 2))
        node.style.width = size + 'px'
        node.style.height = size + 'px'
        node.style.transform = `translate3d(${x}px,${y}px,0)`
        const image = node.querySelector('img')
        if (image) image.style.transform = `scaleX(${p.right ? 1 : -1})`
      })
    }
    function loop(now: number) {
      elapsed.current += Math.max(0, Math.min(now - last, 100))
      last = now
      draw()
      frame = requestAnimationFrame(loop)
    }
    draw()
    if (moving && !paused && !reduced) frame = requestAnimationFrame(loop)
    const observer = new ResizeObserver(draw)
    if (tank.current) observer.observe(tank.current)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [round, moving, paused, reduced])
  return (
    <div
      ref={tank}
      className={`count-tank ${reveal ? 'is-revealed' : ''}`}
      role="group"
      aria-label="움직이는 어항"
    >
      <div className="count-water-light" aria-hidden="true" />
      <div className="count-sand" aria-hidden="true" />
      <svg
        className="count-scenery"
        viewBox="0 0 400 500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g fill="none" stroke="#70aaa0" strokeWidth="9" strokeLinecap="round">
          <path d="M25 500 Q50 460 26 420 T35 340 M48 500 Q23 450 55 410 T50 370 M375 500 Q350 450 375 405 T360 335 M350 500 Q375 460 345 425 T355 380" />
        </g>
        <g
          fill="none"
          stroke="#cba9a0"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M95 500 V435 M95 472 L72 452 V430 M95 458 L118 438 V417 M72 444 L58 430 M118 432 L133 420 M302 500 V451 M302 477 L280 458 V440 M302 467 L324 446 V428" />
        </g>
        <g fill="#9bb9ad">
          <ellipse cx="45" cy="499" rx="39" ry="15" />
          <ellipse cx="347" cy="499" rx="33" ry="12" />
        </g>
      </svg>
      {round.fish.map((fish, i) => {
        const target = round.targets.includes(fish.kind)
        return (
          <div
            key={i}
            ref={(node) => {
              nodes.current[i] = node
            }}
            className={`count-swimmer ${reveal && !target ? 'is-dim' : ''}`}
          >
            <Creature kind={fish.kind} />
          </div>
        )
      })}
    </div>
  )
})

function OrderCards({
  order,
  disabled,
  onAction,
}: {
  order: number[]
  disabled: boolean
  onAction: (a: CountingAction) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const drag = useRef<{ index: number; x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  return (
    <section className="order-entry" aria-label="많은 순서 정렬">
      <p>많은 순 → 적은 순 · 드래그하거나 두 카드를 눌러 교환</p>
      <div className="order-cards">
        {order.map((kind, index) => (
          <button
            key={kind}
            type="button"
            data-order-index={index}
            disabled={disabled}
            className={`order-card ${selected === index ? 'is-selected' : ''} ${over === index ? 'is-over' : ''}`}
            aria-pressed={selected === index}
            aria-label={`${index + 1}위 ${CREATURES[kind].name}`}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              drag.current = { index, x: e.clientX, y: e.clientY, moved: false }
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              const d = drag.current
              if (!d) return
              if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true
              if (d.moved) {
                const el = document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest<HTMLElement>('[data-order-index]')
                setOver(el ? Number(el.dataset.orderIndex) : null)
              }
            }}
            onPointerUp={(e) => {
              const d = drag.current
              drag.current = null
              setOver(null)
              if (!d) return
              suppressClick.current = d.moved
              if (d.moved) {
                const el = document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest<HTMLElement>('[data-order-index]')
                if (el) onAction({ type: 'move', from: d.index, to: Number(el.dataset.orderIndex) })
                setSelected(null)
              }
            }}
            onPointerCancel={() => {
              drag.current = null
              setOver(null)
              suppressClick.current = false
            }}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false
                return
              }
              if (selected === null) setSelected(index)
              else {
                onAction({ type: 'swap', from: selected, to: index })
                setSelected(null)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault()
                onAction({
                  type: 'move',
                  from: index,
                  to: Math.max(0, Math.min(3, index + (e.key === 'ArrowLeft' ? -1 : 1))),
                })
                setSelected(null)
              }
            }}
          >
            <b>{index + 1}</b>
            <Creature kind={kind} />
            <span>{CREATURES[kind].name}</span>
            <span aria-hidden="true">⠿</span>
          </button>
        ))}
      </div>
      <button
        className="count-primary"
        disabled={disabled}
        onClick={() => onAction({ type: 'submit' })}
      >
        확인
        <Check size={17} />
      </button>
    </section>
  )
}

export default function CalculationGame() {
  const [tab, setTab] = useState<GameTab>('game')
  const [open, setOpen] = useState(false),
    [paused, setPaused] = useState(false),
    [startStage, setStartStage] = useState(1)
  const [state, dispatch] = useReducer(countingReducer, undefined, () => createCountingGame())
  const assets = useArtwork(),
    last = useRef(0)
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const attachDialog = useCallback((node: HTMLDialogElement | null) => {
    dialogRef.current = node
  }, [])
  const round = state.rounds[state.round],
    phase = state.phase,
    feedback = phase === 'feedback',
    correct = feedback && state.outcome === 'correct'
  const timed = open && phase === 'counting'
  const prompt = '누가 더 많을까요? 많은 순서대로 정렬하세요!'
  useEffect(() => {
    last.current = performance.now()
    if (paused || !timed) return
    const interval = window.setInterval(() => {
      const now = performance.now()
      dispatch({ type: 'tick', elapsed: now - last.current })
      last.current = now
    }, 50)
    return () => window.clearInterval(interval)
  }, [phase, paused, timed, state.round])
  function act(action: CountingAction) {
    if (paused) return
    if (timed) {
      const now = performance.now()
      dispatch({ type: 'tick', elapsed: now - last.current })
      last.current = now
    }
    dispatch(action)
  }
  useEffect(() => {
    const dialog = dialogRef.current,
      viewport = window.visualViewport
    if (!open || !dialog || !viewport) return
    const resize = () => {
      dialog.style.height = Math.min(window.innerHeight, viewport.height) + 'px'
      dialog.style.maxHeight = dialog.style.height
    }
    resize()
    viewport.addEventListener('resize', resize)
    return () => {
      viewport.removeEventListener('resize', resize)
      dialog.style.removeProperty('height')
      dialog.style.removeProperty('max-height')
    }
  }, [open])
  function start() {
    dispatch({ type: 'reset', state: createCountingGame(Math.random, startStage) })
    setPaused(false)
    setOpen(true)
  }
  const ending = state.lives === 0 || state.round === state.rounds.length - 1
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <GameTabs id="counting" value={tab} onChange={setTab} />
      {tab === 'rank' && (
        <section
          role="tabpanel"
          id="counting-rank-panel"
          aria-labelledby="counting-rank-tab"
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center"
        >
          <h2 className="text-sm font-medium">랭킹 준비 중</h2>
          <p className="text-xs text-muted-foreground">실전이 열리면 랭킹도 함께 시작돼요.</p>
          <p className="text-xs text-muted-foreground">연습 기록은 랭킹에 반영되지 않아요.</p>
        </section>
      )}
      <GamePanel id="counting" hidden={tab !== 'game'}>
        <GameModal
          open={open}
          title="누가 더 많을까?"
          active={phase !== 'result'}
          practice
          onExit={() => setOpen(false)}
          onPause={setPaused}
          showHeader={false}
          onContainer={attachDialog}
          layout="fullscreen"
        >
          {(exit) =>
            !open ? (
              <div className="count-start-menu">
                <GameStartOverlay
                  title="누가 더 많을까?"
                  description="어항 속 친구들을 많은 순서대로 나열해주세요!"
                  poster={countingThumbnail}
                  paidLabel="실전 · 준비 중"
                  paidDisabled
                  onPaid={() => {}}
                  onPractice={start}
                  practiceDisabled={assets.status !== 'ready'}
                  practiceLabel={assets.status === 'loading' ? '그림 로딩 중…' : '연습'}
                >
                  <label className="count-stage-select">
                    시작 단계
                    <select
                      value={startStage}
                      onChange={(e) => setStartStage(Number(e.target.value))}
                    >
                      {Array.from({ length: STAGE_COUNT }, (_, i) => (
                        <option value={i + 1} key={i}>
                          {i + 1}단계 · 4종 정렬
                        </option>
                      ))}
                    </select>
                  </label>
                  {assets.status === 'error' && (
                    <button className="count-text" onClick={assets.retry}>
                      그림 다시 불러오기
                    </button>
                  )}
                  <small>
                    {STAGE_COUNT}단계 · 단계마다 2문제 · 기회 3개
                    <br />
                    무료 연습 · 골드와 주간 순위에 반영되지 않아요.
                  </small>
                </GameStartOverlay>
              </div>
            ) : (
              <div className={`count-game phase-${phase}`}>
                <header className="count-hud">
                  <button aria-label="게임 나가기" onClick={exit}>
                    <ArrowLeft size={20} />
                  </button>
                  <span>
                    <b>{round.stage}단계</b> · {round.question}/2 문제
                  </span>
                  <span className="count-hearts" aria-label={`남은 기회 ${state.lives}개`}>
                    {[0, 1, 2].map((i) => (
                      <Heart
                        key={i}
                        size={15}
                        fill={i < state.lives ? 'currentColor' : 'none'}
                        opacity={i < state.lives ? 1 : 0.25}
                      />
                    ))}
                  </span>
                </header>
                {phase === 'result' ? (
                  <section className="count-result" aria-label="연습 결과">
                    <Fish size={36} />
                    <p className="count-eyebrow">오늘의 어항 관찰</p>
                    <h2>{state.lives > 0 ? '모두 찾았어요!' : '연습 완료!'}</h2>
                    <strong>
                      {state.score.toLocaleString()}
                      <small>점</small>
                    </strong>
                    <p>
                      정답 {state.correct} / {state.round - state.firstRound + 1}문제
                    </p>
                    <p>
                      {state.rounds[state.firstRound].stage}~{round.stage}단계
                    </p>
                    <button className="count-primary" onClick={start}>
                      <RotateCcw size={16} />
                      다시 연습
                    </button>
                    <button className="count-text" onClick={exit}>
                      시작 화면으로
                    </button>
                  </section>
                ) : phase === 'briefing' ? (
                  <section className="count-briefing" aria-live="polite">
                    <p className="count-eyebrow">이번에 찾을 친구</p>
                    <div className="count-targets" aria-label="셀 개체">
                      {round.targets.map((kind) => (
                        <div key={kind}>
                          <Creature kind={kind} />
                          <strong>{CREATURES[kind].name}</strong>
                        </div>
                      ))}
                    </div>

                    <button className="count-primary" onClick={() => act({ type: 'start' })}>
                      시작
                      <ChevronRight size={18} />
                    </button>
                  </section>
                ) : (
                  <>
                    <div
                      className={`count-timer ${phase === 'counting' && state.remaining <= 3000 ? 'is-urgent' : ''}`}
                    >
                      <div
                        role="progressbar"
                        aria-label="남은 시간"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={
                          phase === 'counting'
                            ? Math.ceil((state.remaining / round.duration) * 100)
                            : 0
                        }
                      >
                        <i
                          style={{
                            transform: `scaleX(${phase === 'counting' ? state.remaining / round.duration : 0})`,
                          }}
                        />
                      </div>
                      <span>
                        {phase === 'counting' ? `${Math.ceil(state.remaining / 1000)}초` : '확인'}
                      </span>
                    </div>
                    <h2
                      className={`count-prompt ${feedback ? (correct ? 'answer-success' : 'answer-failure') : ''}`}
                      role={feedback ? 'status' : undefined}
                      aria-live="polite"
                    >
                      {feedback &&
                        (correct ? (
                          <CircleCheck size={19} />
                        ) : state.outcome === 'timeout' ? (
                          <Timer size={19} />
                        ) : (
                          <CircleX size={19} />
                        ))}
                      {feedback
                        ? correct
                          ? '정답! 모두 정확해요!'
                          : state.outcome === 'timeout'
                            ? '시간 초과 · 기회 −1'
                            : '오답 · 기회 −1'
                        : prompt}
                    </h2>
                    <div
                      className={`count-scene ${feedback ? (correct ? 'is-success' : 'is-failure') : ''}`}
                    >
                      <Aquarium
                        key={state.round}
                        round={round}
                        moving={phase === 'counting'}
                        paused={paused}
                        reveal={feedback}
                      />
                      {feedback && (
                        <div
                          className={`answer-burst ${correct ? 'is-success' : 'is-failure'}`}
                          aria-hidden="true"
                        >
                          <div className="answer-burst-mark">
                            {correct ? (
                              <CircleCheck />
                            ) : state.outcome === 'timeout' ? (
                              <Timer />
                            ) : (
                              <CircleX />
                            )}
                          </div>
                          <strong>
                            {correct
                              ? '정답!'
                              : state.outcome === 'timeout'
                                ? '시간 초과'
                                : '아쉬워요!'}
                          </strong>
                          {correct && (
                            <div className="answer-sparkles">
                              {Array.from({ length: 8 }, (_, i) => (
                                <i
                                  key={i}
                                  style={{ transform: `rotate(${i * 45}deg) translateY(-82px)` }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {feedback ? (
                      <section className="count-feedback" aria-live="polite">
                        {!correct && (
                          <div className="submitted-order" aria-label="내가 제출한 순서">
                            <span>내 순서</span>
                            {state.order.map((kind, i) => (
                              <div
                                key={kind}
                                className={
                                  answerOrder(round)[i] === kind ? 'is-correct' : 'is-wrong'
                                }
                              >
                                <Creature kind={kind} />
                                <small>{i + 1}위</small>
                                {answerOrder(round)[i] === kind ? (
                                  <Check size={13} />
                                ) : (
                                  <CircleX size={13} />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="answer-order-label">정답 순서 · 많은 순 → 적은 순</p>
                        <div className="count-answers">
                          {answerOrder(round).map((kind, i) => (
                            <div key={kind} className={state.order[i] === kind ? 'is-correct' : ''}>
                              <small>{i + 1}위</small>
                              <Creature kind={kind} />
                              <span>{CREATURES[kind].name}</span>
                              <strong>{countKind(round, kind)}마리</strong>
                            </div>
                          ))}
                        </div>
                        <button className="count-primary" onClick={() => act({ type: 'next' })}>
                          {ending ? '결과 보기' : '다음 문제'}
                          <ChevronRight size={18} />
                        </button>
                      </section>
                    ) : (
                      <OrderCards
                        key={state.round}
                        order={state.order}
                        disabled={paused}
                        onAction={act}
                      />
                    )}
                  </>
                )}
              </div>
            )
          }
        </GameModal>
      </GamePanel>
    </div>
  )
}
