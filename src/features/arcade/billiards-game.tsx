import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'
import { GameTabs, GameStartOverlay, type GameTab } from './game-controls'
import { GameModal } from './game-modal'
import { createBilliards } from './billiards-model'
import { useAuth } from '@/components/auth-provider'
import { useAccountResource } from '@/lib/account-query'
import { getQueryAccount, isCurrentAccount } from '@/lib/account-cache'
import { randomId } from '@/lib/random-id'
import {
  readBilliards,
  startBilliards,
  saveBilliards,
  billiardsError,
  type BilliardsRun,
} from './billiards-api'
import {
  BILLIARDS_ENGINE_VERSION,
  verifyBilliardsReplay,
  type BilliardsReplay,
} from './billiards-replay'
import { BilliardsRanking } from './billiards-ranking'
import './billiards.css'
let sceneModule: Promise<typeof import('./billiards-scene')> | undefined
function loadScene() {
  return (sceneModule ??= import('./billiards-scene').catch((error) => {
    sceneModule = undefined
    throw error
  }))
}

function Practice({
  best,
  paused,
  onFinish,
  onRetry,
  initialReplay,
  onCheckpoint,
  paid = false,
  busy = false,
  reward,
  onLoadRetry,
}: {
  best: number | null
  paused: boolean
  onFinish: (score: number, replay: BilliardsReplay) => void
  onRetry: () => void
  initialReplay?: BilliardsReplay
  onCheckpoint: (replay: BilliardsReplay) => void
  paid?: boolean
  busy?: boolean
  reward: number | null
  onLoadRetry: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const [hud, setHud] = useState(() => createBilliards())
  const pause = useRef(paused)
  useEffect(() => {
    pause.current = paused
  }, [paused])
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let disposed = false
    let game: { destroy: (remove: boolean) => void } | undefined
    const state = initialReplay
      ? verifyBilliardsReplay(initialReplay, Infinity).state
      : createBilliards()
    let savedShots = state.shots.length
    let finished = false
    loadScene()
      .then(({ mountBilliards }) => {
        if (disposed || !host.current) return
        game = mountBilliards(
          host.current,
          state,
          () => {
            if (!disposed) {
              if (state.phase === 'lost' && !finished) {
                finished = true
                onFinish(state.score, {
                  version: BILLIARDS_ENGINE_VERSION,
                  shots: state.shots.map((shot) => ({ ...shot })),
                })
              } else if (state.phase === 'aim' && state.shots.length > savedShots) {
                savedShots = state.shots.length
                onCheckpoint({
                  version: BILLIARDS_ENGINE_VERSION,
                  shots: state.shots.map((shot) => ({ ...shot })),
                })
              }
              setReady(true)
              setHud({ ...state, balls: state.balls.map((b) => ({ ...b })) })
            }
          },
          () => pause.current,
        )
      })
      .catch(() => {
        if (!disposed) setError(true)
      })
    return () => {
      disposed = true
      game?.destroy(true)
    }
  }, [onFinish, onCheckpoint, initialReplay])
  return (
    <div className="billiards-play">
      <div className="billiards-hud-slot">
        {hud.phase !== 'lost' && (
          <div className="billiards-hud">
            <strong>{hud.score}점</strong>
            <span>
              <span aria-label={`남은 목숨 ${hud.lives}개`} style={{ color: '#bd6552' }}>
                {' '}
                {'♥'.repeat(hud.lives)}
                {'♡'.repeat(5 - hud.lives)}{' '}
              </span>
            </span>
            <button
              onClick={onRetry}
              aria-label="점수와 목숨을 초기화하여 새로 시작"
              title="새로 시작"
              disabled={busy}
            >
              <RotateCcw size={17} />
            </button>
          </div>
        )}
      </div>
      <div className="billiards-board">
        <div
          ref={host}
          className="billiards-canvas"
          aria-label="큐대를 잡아 흰 공 주위로 돌리고 뒤로 당기는 4구 당구대"
        />
        {!ready && (
          <div className="billiards-result">
            {error ? '게임을 불러오지 못했어요.' : '당구대를 준비하고 있어요…'}
            {error && <button onClick={onLoadRetry}>다시 시도</button>}
          </div>
        )}
        {hud.phase === 'lost' && (
          <div className="billiards-result" role="status">
            <Trophy size={36} />
            <p className="billiards-result-label">도전 종료</p>
            <h2>{hud.score}점</h2>
            <p hidden={paid}>
              {best !== null && best > hud.score
                ? `이번 방문 최고 ${best}점`
                : '이번 방문 최고 기록'}
            </p>
            {paid && (
              <p>
                {reward === null
                  ? '기록과 보상을 확인하고 있어요…'
                  : `${reward.toLocaleString('ko-KR')}골드 지급 완료`}
              </p>
            )}
            <button disabled={busy} onClick={onRetry}>
              {paid ? '다시 도전 · 10골드' : '다시 도전'}
            </button>
          </div>
        )}
      </div>
      <p className="billiards-message" aria-live="polite">
        {paid && busy ? '기록 저장 중…' : hud.phase === 'aim' && hud.shotCount > 0 ? hud.message : ''}
      </p>
    </div>
  )
}

export default function BilliardsGame() {
  const { session } = useAuth()
  return <AccountBilliards key={session?.user.id ?? 'guest'} />
}
function AccountBilliards() {
  const { session } = useAuth()
  const query = useAccountResource('billiards', readBilliards)
  const [tab, setTab] = useState<GameTab>('game')
  const [best, setBest] = useState<number | null>(null)
  const [paid, setPaid] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [ended, setEnded] = useState(false),
    [reward, setReward] = useState<number | null>(null)
  const [initialReplay, setInitialReplay] = useState<BilliardsReplay>()
  const paidRun = useRef<BilliardsRun | null>(null),
    operation = useRef<string | null>(null),
    locked = useRef(false),
    alive = useRef(true),
    scope = useRef(getQueryAccount())
  const replay = useRef<BilliardsReplay>({ version: BILLIARDS_ENGINE_VERSION, shots: [] })
  const pending = useRef<{ runId: string; replay: BilliardsReplay; final: boolean } | null>(null)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const current = () => alive.current && isCurrentAccount(scope.current)
  async function persist(value: BilliardsReplay, final: boolean) {
    if (locked.current || !paidRun.current || !current()) return false
    locked.current = true
    setBusy(true)
    setError('')
    setPaused(true)
    pending.current ??= { runId: paidRun.current.id, replay: value, final }
    try {
      const p = pending.current,
        result = await saveBilliards(p.runId, p.replay, p.final)
      if (!current()) return false
      paidRun.current = result.run
      pending.current = null
      if (result.run?.finished_at) setReward(result.run.reward)
      setPaused(false)
      return true
    } catch (cause) {
      if (current()) setError(billiardsError(cause))
      return false
    } finally {
      locked.current = false
      if (current()) setBusy(false)
    }
  }
  const save = useRef(persist)
  save.current = persist
  const onFinish = useCallback(
    (score: number, value: BilliardsReplay) => {
      setBest((previous) => (previous === null ? score : Math.max(previous, score)))
      setEnded(true)
      replay.current = value
      if (paid) void save.current(value, true)
    },
    [paid],
  )
  const onCheckpoint = useCallback(
    (value: BilliardsReplay) => {
      replay.current = value
      if (paid) void save.current(value, false)
    },
    [paid],
  )
  const [run, setRun] = useState(0)
  const [open, setOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  function practice() {
    if (busy || pending.current || operation.current) return
    setPaid(false)
    setInitialReplay(undefined)
    setReward(null)
    setError('')
    setEnded(false)
    setRun((n) => n + 1)
    setPaused(false)
    setOpen(true)
  }
  async function startPaid() {
    if (locked.current || pending.current || !current()) return
    locked.current = true
    setBusy(true)
    setError('')
    operation.current ??= randomId()
    try {
      const result = await startBilliards(operation.current)
      if (!current()) return
      if (!result.run || result.run.finished_at) {
        operation.current = null
        throw new Error('FINISHED_RUN')
      }
      if (result.run.engine_version !== BILLIARDS_ENGINE_VERSION)
        throw new Error('ENGINE_VERSION_MISMATCH')
      paidRun.current = result.run
      operation.current = null
      replay.current = result.run.replay
      setInitialReplay(result.run.replay)
      setPaid(true)
      setReward(null)
      setEnded(false)
      setRun((n) => n + 1)
      setPaused(false)
      setOpen(true)
    } catch (cause) {
      if (current()) setError(billiardsError(cause))
    } finally {
      locked.current = false
      if (current()) setBusy(false)
    }
  }
  async function restart() {
    if (busy || pending.current) return
    if (paid) {
      if (paidRun.current && !paidRun.current.finished_at && !(await persist(replay.current, true)))
        return
      await startPaid()
    } else practice()
  }
  async function exit() {
    if (
      paid &&
      paidRun.current &&
      !paidRun.current.finished_at &&
      !(await persist(replay.current, true))
    )
      throw new Error('SAVE_FAILED')
    setOpen(false)
  }
  return (
    <section className="billiards-page">
      <GameTabs id="billiards" value={tab} onChange={setTab} />
      <div
        id="billiards-rank-panel"
        role="tabpanel"
        aria-labelledby="billiards-rank-tab"
        hidden={tab !== 'rank'}
      >
        {tab === 'rank' && <BilliardsRanking />}
      </div>
      <div
        id="billiards-game-panel"
        role="tabpanel"
        aria-labelledby="billiards-game-tab"
        hidden={tab !== 'game'}
        className={tab === 'game' ? 'relative min-h-0 flex-1' : 'hidden'}
      >
        {tab === 'game' && (
          <GameStartOverlay
            title="퐁이 당구"
            description="큐대를 잡아 돌리고, 뒤로 당겨서 놓으세요."
            poster="/arcade/billiards/thumbnail.webp"
            rules={[
              '빨간 공마다 +10점 · 노란 공 −10점',
              '한 샷에 두 빨간 공만 맞히면 목숨 유지 · 그 외 목숨 −1',
            ]}
            paidLabel={
              operation.current
                ? '참가 결과 다시 확인'
                : query.data?.run && !query.data.run.finished_at
                  ? '실전 이어하기'
                  : undefined
            }
            paidDisabled={!session || busy || !!pending.current}
            practiceDisabled={busy || !!pending.current || !!operation.current}
            onPaid={() => void startPaid()}
            practiceLabel="연습 시작"
            fee={10}
            onPractice={practice}
          >
            <p className="text-sm">♥ 목숨 5개로 최고 기록 도전</p>
            <p className="text-xs text-white/75">
              이번 방문 최고 {best === null ? '—' : best + '점'} · 무료 연습
            </p>
            <p className="text-xs text-white/60">
              실전 종료 점수만큼 골드 즉시 지급 · 주간 랭킹 별도 정산
            </p>
            <p className="text-xs text-white/60">연습은 무료 · 보상과 랭킹 기록 없음</p>
            {error && !open && <p role="alert">{error}</p>}
          </GameStartOverlay>
        )}
      </div>
      <div hidden={!open} className={open ? 'contents' : 'hidden'}>
        <GameModal
          open={open}
          title="퐁이 당구"
          active={!ended}
          practice={!paid}
          busy={busy || !!pending.current}
          exitDescription={
            paid
              ? '완료된 샷의 점수만큼 골드를 받고 종료해요. 주간 랭킹에는 기록되지 않아요.'
              : undefined
          }
          onPause={setPaused}
          onExit={exit}
        >
          {open && (
            <Practice
              key={run}
              best={best}
              paused={paused}
              onRetry={() => void restart()}
              onFinish={onFinish}
              onCheckpoint={onCheckpoint}
              initialReplay={initialReplay}
              paid={paid}
              busy={busy || !!pending.current}
              reward={reward}
              onLoadRetry={() => setRun((n) => n + 1)}
            />
          )}
          {open && error && (
            <div role="alert" className="shrink-0 p-3 text-center text-sm">
              <p>{error}</p>
              {pending.current && (
                <button
                  className="mt-2 rounded-lg border px-3 py-2"
                  disabled={busy}
                  onClick={() => {
                    const p = pending.current
                    if (p) void persist(p.replay, p.final)
                  }}
                >
                  저장 결과 다시 확인
                </button>
              )}
            </div>
          )}
        </GameModal>
      </div>
    </section>
  )
}
