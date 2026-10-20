import { GamePanel, GameStage } from './game-layout'
import { WeeklyRewards } from './weekly-rewards'
import { RankingRow, rankingListClass } from './ranking-row'
import { randomId } from '@/lib/random-id'
import { useEffect, useRef, useState } from 'react'
import { Clock3, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAuth } from '@/components/auth-provider'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import {
  memoryAction,
  memoryError,
  memoryFaces,
  memoryLeaderboard,
  memoryNames,
  memoryTime,
  type MemoryAction,
  type MemoryLeaderboard,
  type MemoryState,
} from './memory-api'
import { createMemoryPractice } from './memory-practice'
import './memory-game.css'
import { GameTabs, GameStartOverlay } from './game-controls'
import { GameModal } from './game-modal'

export function MemoryRanking() {
  const [data, setData] = useState<MemoryLeaderboard | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const active = useRef(true),
    lock = useRef(false)
  async function load(offset = 0) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const result = await memoryLeaderboard(offset)
      if (active.current) {
        setData((old) => ({
          ...result,
          rows: offset && old ? [...old.rows, ...result.rows] : result.rows,
        }))
        setError('')
      }
    } catch (cause) {
      if (active.current) setError(memoryError(cause))
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  useEffect(() => {
    active.current = true
    void load()
    return () => {
      active.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3"
      role="tabpanel"
      id="memory-rank-panel"
      aria-labelledby="memory-rank-tab"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-normal">이번 주 기록</h3>
        <Button
          variant="ghost"
          size="icon"
          aria-label="순위 새로고침"
          disabled={busy}
          onClick={() => void load()}
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        한국 시간 월요일부터 일요일 자정까지 · 개인 최고 기록
        <br />
        짧은 시간이 우선이며 동점은 먼저 완료한 순서예요.
      </p>
      <WeeklyRewards rewards={data?.rewards} weekEnd={data?.weekEnd} />
      <ol className={rankingListClass}>
        {data?.rows.map((row) => (
          <RankingRow
            key={row.id}
            rank={row.rank}
            nickname={row.nickname}
            mine={row.mine}
            record={
              <>
                <span className="block">{memoryTime(row.elapsedMs)}</span>
                {row.rewardGold !== undefined && (
                  <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                    <GoldIcon className="size-3.5" />
                    {row.rewardGold.toLocaleString('ko-KR')}
                  </span>
                )}
              </>
            }
          />
        ))}
      </ol>
      {data && !data.total && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          이번 주 첫 기록을 남겨보세요.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="text-xs">
          기록을 불러오는 중…
        </p>
      )}
      {data && data.rows.length < data.total && (
        <Button
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={() => void load(data.rows.length)}
        >
          기록 더 보기 ({data.rows.length}/{data.total})
        </Button>
      )}
    </div>
  )
}

export default function MemoryGame() {
  const { session } = useAuth()
  return <AccountMemory key={session?.user.id ?? 'guest'} />
}
function AccountMemory() {
  const [modalContainer, setModalContainer] = useState<HTMLDialogElement | null>(null)
  const [gameOpen, setGameOpen] = useState(false),
    restore = useRef(true)
  const gold = useGold(),
    [state, setState] = useState<MemoryState | null>(null)
  const [tab, setTab] = useState<'game' | 'rank'>('game'),
    [practiceMode, setPracticeMode] = useState(false)
  const [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<'start' | 'leave' | null>(null),
    [elapsed, setElapsed] = useState(0)
  const active = useRef(true),
    lock = useRef(false),
    operation = useRef<string | null>(null)
  const practice = useRef<ReturnType<typeof createMemoryPractice> | null>(null)
  const clock = useRef({ received: 0, elapsed: 0 }),
    known = useRef<Record<number, string>>({})
  const run = state?.run,
    playing = Boolean(run && !run.finished && !run.abandoned)
  function apply(next: MemoryState) {
    if (next.run?.id !== state?.run?.id) known.current = {}
    next.run?.cards.forEach((face, i) => {
      if (face) known.current[i] = face
    })
    clock.current = { received: performance.now(), elapsed: next.run?.elapsedMs ?? 0 }
    setElapsed(next.run?.elapsedMs ?? 0)
    setState(next)
    setError('')
    setLoaded(true)
  }
  async function request(args: MemoryAction) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const result = practice.current ? practice.current(args) : await memoryAction(args)
      if (!active.current) return
      apply(result)
      if (restore.current) {
        restore.current = false
        if (result.run && !result.run.finished && !result.run.abandoned) setGameOpen(true)
      }
      if (args.p_action === 'start') {
        setGameOpen(true)
        operation.current = null
        setConfirmation(null)
        if (!practice.current) void gold.refresh()
      }
      if (args.p_action === 'leave') {
        setConfirmation(null)
        setState(null)
        setElapsed(0)
        known.current = {}
      }
      return result
    } catch (cause) {
      if (active.current) {
        setError(memoryError(cause))
        setLoaded(true)
      }
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  useEffect(() => {
    active.current = true
    void request({ p_action: 'state' })
    const reload = () => {
      if (!practice.current && document.visibilityState === 'visible')
        void request({ p_action: 'state' })
    }
    window.addEventListener('focus', reload)
    window.addEventListener('online', reload)
    // Preload fronts so flipping does not wait for a new image request.
    const images = [...memoryFaces, 'back'].map((face) => {
      const img = new Image()
      img.src = `/arcade/memory/${face}.png`
      return img
    })
    return () => {
      active.current = false
      window.removeEventListener('focus', reload)
      window.removeEventListener('online', reload)
      images.forEach((img) => {
        img.onload = null
        img.onerror = null
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!run?.startedAt || run.finished || run.abandoned) return
    const timer = setInterval(
      () => setElapsed(clock.current.elapsed + performance.now() - clock.current.received),
      100,
    )
    return () => clearInterval(timer)
  }, [run?.startedAt, run?.finished, run?.abandoned])
  useEffect(() => {
    if (!run?.clearAt || busy || error || !playing) return
    const wait =
      Math.max(
        0,
        Date.parse(run.clearAt) -
          Date.parse(state!.serverNow) -
          (performance.now() - clock.current.received),
      ) + 60
    const timer = setTimeout(() => void request({ p_action: 'clear', p_run_id: run.id }), wait)
    return () => clearTimeout(timer)
  }, [run?.clearAt, busy, error, playing]) // eslint-disable-line react-hooks/exhaustive-deps
  function startPractice() {
    if (lock.current) return
    practice.current = createMemoryPractice()
    setPracticeMode(true)
    void request({ p_action: 'start' })
  }
  function startPaid() {
    practice.current = null
    setPracticeMode(false)
    operation.current ??= randomId()
    void request({ p_action: 'start', p_operation_id: operation.current })
  }
  return (
    <div className="memory-game flex min-h-0 min-w-0 flex-1 flex-col">
      <GameTabs id="memory" value={tab} onChange={setTab} />
      {tab === 'rank' ? (
        <MemoryRanking />
      ) : (
        <GameModal
          onContainer={setModalContainer}
          open={gameOpen}
          title="카드 짝맞추기"
          active={playing}
          practice={practiceMode}
          busy={busy}
          onExit={async () => {
            if (playing) {
              const result = await request({ p_action: 'leave', p_run_id: run!.id })
              if (!result) throw Error('LEAVE_FAILED')
            }
            setGameOpen(false)
          }}
        >
          <GamePanel id="memory" className="gap-2">
            {playing && (
              <div className="flex shrink-0 items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                <span
                  className="flex items-center gap-2 text-2xl font-normal tabular-nums tracking-wide"
                  aria-label={`경과 시간 ${memoryTime(elapsed)}`}
                >
                  <Clock3 className="size-5 text-primary" />
                  {memoryTime(elapsed)}
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {(run?.matched.length ?? 0) / 2}/12
                </span>
              </div>
            )}
            <GameStage className="memory-board-space">
              <div className="memory-board" role="group" aria-label="5행 5열 카드판">
                {Array.from({ length: 25 }, (_, i) => {
                  const face = i === 12 ? 'pongi' : (run?.cards[i] ?? null),
                    up = Boolean(face),
                    matched = run?.matched.includes(i + 1)
                  const art = face ?? known.current[i]
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={
                        i === 12
                          ? '퐁이 조커 · 처음부터 공개'
                          : up
                            ? `${i + 1}번 ${memoryNames[face!] ?? face}${matched ? ' · 짝 완성' : ''}`
                            : `${i + 1}번 카드 뒤집기`
                      }
                      aria-pressed={up}
                      disabled={
                        !playing ||
                        busy ||
                        i === 12 ||
                        Boolean(matched) ||
                        run?.first === i + 1 ||
                        (run?.second !== null && run?.second !== undefined)
                      }
                      onClick={() =>
                        void request({ p_action: 'flip', p_run_id: run!.id, p_card: i + 1 })
                      }
                      className={`memory-card ${up ? 'is-up' : ''} ${matched ? 'is-matched' : ''} ${i === 12 ? 'is-pongi' : ''}`}
                    >
                      <span className="memory-card-inner">
                        <span className="memory-card-back" aria-hidden="true">
                          <img src="/arcade/memory/back.png" alt="" draggable={false} />
                        </span>
                        <span className="memory-card-front" aria-hidden="true">
                          {art && (
                            <img
                              src={
                                art === 'pongi'
                                  ? '/branding/pongi.png'
                                  : `/arcade/memory/${art}.png`
                              }
                              alt=""
                              draggable={false}
                            />
                          )}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {!playing && (
                <GameStartOverlay
                  rules={[
                    '두 장씩 뒤집어 같은 그림 12쌍을 찾으세요.',
                    '첫 카드를 뒤집으면 시간이 시작돼요.',
                    '모든 쌍을 찾은 시간으로 순위를 겨뤄요.',
                  ]}
                  poster="/arcade/memory/thumbnail.png"
                  title={run?.finished ? `완성! ${memoryTime(run.elapsedMs)}` : '카드 짝맞추기'}
                  description={
                    run?.finished
                      ? practiceMode
                        ? '연습 완료 · 기록 미등록'
                        : '이번 주 기록에 등록됐어요.'
                      : '같은 그림의 카드 두 장을 찾아주세요.'
                  }
                  paidDisabled={
                    !loaded ||
                    busy ||
                    gold.loading ||
                    gold.busy ||
                    Boolean(gold.error) ||
                    gold.wallet.gold < 10 ||
                    Boolean(error)
                  }
                  practiceDisabled={!loaded || busy}
                  onPaid={() => setConfirmation('start')}
                  onPractice={startPractice}
                />
              )}
            </GameStage>
            <div className="shrink-0 space-y-1">
              {playing && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setConfirmation('leave')}
                  >
                    그만하기
                  </Button>
                </div>
              )}
              {error && (
                <div role="alert" className="flex items-center gap-1">
                  <p className="flex-1 text-[11px] text-destructive">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void request({ p_action: 'state', ...(run ? { p_run_id: run.id } : {}) })
                    }
                  >
                    재연결
                  </Button>
                </div>
              )}
              {!loaded && (
                <p role="status" className="text-xs text-muted-foreground">
                  게임을 불러오는 중…
                </p>
              )}
            </div>
          </GamePanel>
        </GameModal>
      )}
      <ConfirmDialog
        portalContainer={gameOpen ? modalContainer : undefined}
        illustration={confirmation === 'leave' ? 'caution' : 'game'}
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null)
        }}
        busy={busy}
        error={error}
        title={
          confirmation === 'leave' ? (
            '게임을 그만하시겠습니까?'
          ) : (
            <>
              <span className="block">카드 짝맞추기에</span>
              <span className="inline-flex items-center gap-1">
                <GoldIcon className="size-5" />
                10골드로 참가하시겠습니까?
              </span>
            </>
          )
        }
        description={
          confirmation === 'leave'
            ? '진행 기록은 순위에 등록되지 않으며 참가비는 반환되지 않아요.'
            : '첫 카드를 뒤집으면 시간이 시작돼요. 12짝을 모두 찾아주세요.'
        }
        onConfirm={() =>
          confirmation === 'leave'
            ? void request({ p_action: 'leave', p_run_id: run!.id })
            : startPaid()
        }
      />
    </div>
  )
}
