import { GameOverlay } from './game-overlay'
import { BrickRoundOverlay, BrickResultOverlay } from './brick-game-overlays'
import { GamePanel, GameStage, GameActions } from './game-layout'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GameModal } from './game-modal'
import { useAuth } from '@/components/auth-provider'
import { BRICK_ENGINE_VERSION } from './brick-breaker-replay'
import { BrickRanking } from './brick-ranking'
import { useGold } from '@/features/gold/gold-provider'
import { randomId } from '@/lib/random-id'
import { startBrickRun, settleBrickRun, brickError } from './brick-breaker-api'
import type { BrickRun } from './brick-breaker-api'
import { GameStartOverlay, GameTabs } from './game-controls'
import type { BrickController, BrickMode } from './brick-breaker-scene'
import { BrickMovementControls } from './brick-movement-controls'
import { BrickEffectBadges } from './brick-effect-badges'
import { BrickGameHud } from './brick-game-hud'
import { BrickLifeLoss } from './brick-life-loss'
import { BrickGuide } from './brick-guide'
import { brickDrops } from './brick-drop-catalog'
import './brick-breaker-game.css'
import { MAX_BRICK_ROUNDS } from './brick-breaker-rounds'
import type { BrickScore } from './brick-breaker-model'
import { dropArtwork } from './brick-breaker-artwork'
import { BRICK_COUNT } from './brick-breaker-config'

const initial: BrickScore = { phase: 'ready', round: 1, lives: 3, remaining: BRICK_COUNT }
export default function BrickBreakerGame() {
  const { session } = useAuth()
  return <AccountBrickGame key={session?.user.id ?? 'guest'} />
}
function AccountBrickGame() {
  const gold = useGold(),
    host = useRef<HTMLDivElement>(null),
    controller = useRef<BrickController | null>(null)
  const move = useCallback(
    (direction: -1 | 0 | 1) => controller.current?.setDirection(direction),
    [],
  )
  const target = useCallback(
    (position: number | null) => controller.current?.setTarget(position),
    [],
  )
  const [tab, setTab] = useState<'game' | 'rank'>('game'),
    [score, setScore] = useState(initial),
    [mode, setMode] = useState<BrickMode | null>(null)
  const [ready, setReady] = useState(false),
    [paused, setPaused] = useState(false),
    [error, setError] = useState(''),
    [networkError, setNetworkError] = useState(''),
    [busy, setBusy] = useState(false)
  const paidRun = useRef<BrickRun | null>(null),
    operation = useRef<string | null>(null),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    requestLock = useRef(false),
    alive = useRef(true)
  const started = mode !== null,
    lab = mode === 'lab',
    paid = mode === 'paid',
    ended = score.phase === 'over' || score.phase === 'banked'
  const previousLives = useRef(3),
    [lifeLoss, setLifeLoss] = useState(0)
  useEffect(() => {
    let current = true
    let instance: BrickController | null = null
    alive.current = true
    void import('./brick-breaker-scene')
      .then(({ createBrickGame }) => {
        if (!current || !host.current) return
        instance = createBrickGame(
          host.current,
          (value) => {
            if (current) {
              if (value.lives < previousLives.current) setLifeLoss((count) => count + 1)
              previousLives.current = value.lives
              setScore(value)
            }
          },
          () => {
            if (current) setPaused(true)
          },
          () => {
            if (current) setReady(true)
          },
          () => {
            if (current) {
              setReady(false)
              setError('게임 이미지를 불러오지 못했어요. 새로고침해주세요.')
            }
          },
        )
        controller.current = instance
      })
      .catch(() => {
        if (current) setError('게임 화면을 불러오지 못했어요. 새로고침해주세요.')
      })
    const hide = () => {
      if (document.hidden) {
        controller.current?.pause(true)
        setPaused(true)
      }
    }
    const blur = () => {
      controller.current?.pause(true)
      setPaused(true)
    }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('blur', blur)
    return () => {
      current = false
      alive.current = false
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('blur', blur)
      instance?.destroy()
      if (controller.current === instance) controller.current = null
    }
  }, [])
  useEffect(() => {
    if (!lifeLoss) return
    const timeout = setTimeout(() => setLifeLoss(0), 850)
    return () => clearTimeout(timeout)
  }, [lifeLoss])
  function pause(value: boolean) {
    controller.current?.pause(value)
    setPaused(value)
  }
  function start(nextMode: BrickMode) {
    if (requestLock.current || busy) return
    previousLives.current = 3
    setLifeLoss(0)
    setNetworkError('')
    setMode(nextMode)
    controller.current?.start(nextMode)
    setPaused(false)
  }
  async function startPaid() {
    if (requestLock.current) return
    requestLock.current = true
    setBusy(true)
    setNetworkError('')
    operation.current ??= randomId()
    try {
      let run = await startBrickRun(operation.current)
      if (!alive.current) return
      // Preserve already verified legacy gold before starting with the new rules.
      if (run.engine_version === 1 && !run.finished_at) {
        await settleBrickRun(run.id, run.replay, true)
        operation.current = randomId()
        run = await startBrickRun(operation.current)
      }
      if (!alive.current) return
      if (run.engine_version !== BRICK_ENGINE_VERSION) throw new Error('ENGINE_VERSION_MISMATCH')
      if (run.finished_at) {
        operation.current = null
        throw new Error('FINISHED_OPERATION')
      }
      paidRun.current = run
      operation.current = null
      previousLives.current = 0
      setLifeLoss(0)
      setMode('paid')
      controller.current?.start('paid', Number(run.seed), run.replay)
      setPaused(false)
      void gold.refresh()
    } catch (cause) {
      if (alive.current) setNetworkError(brickError(cause))
    } finally {
      requestLock.current = false
      if (alive.current) setBusy(false)
    }
  }
  function settle(final: boolean) {
    if (!paidRun.current || !controller.current) return Promise.resolve()
    const replay = controller.current.replay(),
      id = paidRun.current.id
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        setBusy(true)
        try {
          const run = await settleBrickRun(id, replay, final)
          paidRun.current = run
          if (alive.current) {
            setNetworkError('')
            void gold.refresh()
          }
        } catch (cause) {
          if (alive.current) setNetworkError(brickError(cause))
          throw cause
        } finally {
          if (alive.current) setBusy(false)
        }
      })
    queue.current = task
    return task
  }
  useEffect(() => {
    if (paid && (score.phase === 'round-clear' || ended)) void settle(ended).catch(() => {})
  }, [paid, score.phase, score.round, ended]) // eslint-disable-line react-hooks/exhaustive-deps
  async function exit() {
    if (paid) await settle(true)
    controller.current?.stop()
    paidRun.current = null
    setMode(null)
    setScore(initial)
    previousLives.current = 3
    setPaused(false)
    setLifeLoss(0)
    setNetworkError('')
  }
  async function next() {
    if (paid) {
      try {
        await settle(score.round >= MAX_BRICK_ROUNDS)
      } catch {
        return
      }
    }
    pause(false)
    controller.current?.next()
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GameTabs id="brick" value={tab} onChange={setTab} />
      {tab === 'rank' && <BrickRanking />}
      <GamePanel id="brick" hidden={tab !== 'game'}>
        <GameModal
          layout="fullscreen"
          open={started}
          title="퐁이의 벽돌깨기"
          active={started && !ended}
          practice={!paid}
          onExit={exit}
          onPause={pause}
          busy={busy}
          modeLabel={lab ? '모션' : paid ? '실전' : '연습'}
          headerClassName="bg-[#38291f] text-[#fff1dd] border-[#e7c19b]/15"
          headerActions={
            <Button
              variant="ghost"
              size="icon"
              aria-label={paused ? '게임 계속하기' : '게임 일시정지'}
              disabled={ended || busy}
              onClick={() => pause(!paused)}
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </Button>
          }
        >
          {() => (
            <section
              className="brick-layout flex min-h-0 flex-1 flex-col bg-[#38291f]"
              aria-label="퐁이 벽돌깨기 연습"
            >
              {started && !lab && (
                <div className="brick-hud shrink-0">
                  <BrickGameHud score={score} practice={!paid} />
                </div>
              )}
              {started && (
                <div className="brick-effects h-10 shrink-0 overflow-hidden">
                  <BrickEffectBadges effects={score.effects ?? []} />
                </div>
              )}
              <GameStage className="brick-stage">
                <div ref={host} className="absolute inset-0" />
                {started && lifeLoss > 0 && <BrickLifeLoss sequence={lifeLoss} />}
                {started &&
                  !lab &&
                  !ended &&
                  (score.phase === 'ready' || score.held) &&
                  !paused &&
                  !error && (
                    <Button
                      className="absolute top-1/2 left-1/2 z-10 min-h-14 -translate-x-1/2 -translate-y-1/2 gap-2 rounded-xl bg-[#9b643c] px-8 text-lg text-white hover:bg-[#ad7549]"
                      disabled={busy}
                      onClick={() => controller.current?.launch()}
                    >
                      <Play className="size-4" />
                      {score.held ? '공 다시 발사' : '시작하기'}
                    </Button>
                  )}
                {!error && !started && (
                  <GameStartOverlay
                    fee={0}
                    poster="/arcade/brick-breaker/thumbnail.png"
                    title="퐁이의 벽돌깨기"
                    description="무료로 도전하고, 라운드를 클리어해 골드를 모아요."
                    rules={[
                      '5개 라운드의 클리어 보상과 획득한 동전·보물이 누적돼요.',
                      '방해물과 공을 놓치는 순간을 조심하세요. 목숨은 3개예요.',
                      '중간에 끝나도 이미 모은 보상은 유지돼요.',
                    ]}
                    paidDisabled={!ready || busy}
                    practiceDisabled={!ready || busy}
                    onPaid={() => void startPaid()}
                    onPractice={() => start('practice')}
                    extraAction={
                      <Button
                        variant="ghost"
                        aria-label="모션"
                        disabled={!ready || busy}
                        className="min-h-14 min-w-0 gap-1 rounded-none border-l px-1 text-xs"
                        onClick={() => start('lab')}
                      >
                        모션
                      </Button>
                    }
                  >
                    <BrickGuide />
                    <p className="text-xs text-white/50">연습·모션은 골드 소모와 보상이 없어요.</p>
                  </GameStartOverlay>
                )}
                {started && ended && (
                  <BrickResultOverlay
                    score={score}
                    paid={paid}
                    busy={busy}
                    onExit={() => void exit().catch(() => {})}
                  />
                )}
                {error && <GameOverlay role="alert" title={error} />}
                {!error && started && !ended && score.phase === 'round-clear' && (
                  <BrickRoundOverlay
                    score={score}
                    paid={paid}
                    busy={busy}
                    onNext={() => void next()}
                  />
                )}
                {!error && started && !ended && score.phase !== 'round-clear' && paused && (
                  <GameOverlay
                    title={'잠시 쉬어가요'}
                    actions={
                      <Button
                        className="min-h-12 rounded-xl"
                        disabled={busy}
                        onClick={() => pause(false)}
                      >
                        {'계속하기'}
                      </Button>
                    }
                  />
                )}
                {networkError && (
                  <div
                    role="alert"
                    className="absolute inset-x-3 bottom-3 z-30 rounded-lg border bg-background p-3 text-sm text-foreground"
                  >
                    {networkError}
                    {paid && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void settle(ended).catch(() => {})}
                      >
                        다시 확인
                      </Button>
                    )}
                  </div>
                )}
              </GameStage>
              {lab && (
                <div className="brick-lab-panel shrink-0">
                  <div
                    id="brick-test-list"
                    aria-label="아이템·방해물 테스트 목록"
                    className="grid max-h-44 shrink-0 grid-cols-2 gap-2 overflow-y-auto border-t bg-background p-2"
                  >
                    {brickDrops.map((drop) => (
                      <Button
                        key={drop.kind}
                        variant="outline"
                        className="min-h-14 min-w-0 justify-start gap-2 px-2"
                        disabled={!ready}
                        onClick={() => {
                          pause(false)
                          controller.current?.previewSkill(drop.kind)
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="relative size-9 shrink-0 overflow-hidden"
                        >
                          <img
                            src={dropArtwork[drop.kind].preview ?? dropArtwork[drop.kind].src}
                            alt=""
                            className={
                              dropArtwork[drop.kind].sheet && !dropArtwork[drop.kind].preview
                                ? 'absolute left-0 top-0 size-18 max-w-none'
                                : 'size-9 object-contain'
                            }
                          />
                        </span>
                        <span className="min-w-0 text-left whitespace-normal">
                          <span className="block text-sm">{drop.name}</span>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {drop.detail}
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {started && (
                <GameActions className="brick-controls">
                  <BrickMovementControls
                    enabled={!ended && !paused && !error && !busy && score.phase !== 'round-clear'}
                    onDirection={move}
                    onTarget={target}
                  />
                </GameActions>
              )}
            </section>
          )}
        </GameModal>
      </GamePanel>
    </div>
  )
}
