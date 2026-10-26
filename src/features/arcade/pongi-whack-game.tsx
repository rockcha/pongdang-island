import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAuth } from '@/components/auth-provider'
import { useAccountResource } from '@/lib/account-query'
import { randomId } from '@/lib/random-id'
import { GameTabs, GameStartOverlay } from './game-controls'
import { GameModal } from './game-modal'
import { WeeklyRewards } from './weekly-rewards'
import { RankingRow, rankingListClass } from './ranking-row'
import { RankingFriendAction } from './ranking-friend-action'
import { actWhack, readWhack, readWhackRanking, whackError, type WhackRun } from './pongi-whack-api'
import {
  practiceWhack,
  scoreWhack,
  whackPoints,
  WHACK_DURATION,
  WHACK_HOLES,
  whackMotion,
  type WhackHit,
  type WhackTarget,
} from './pongi-whack-model'
import './pongi-whack-game.css'
import { createWhackAudio } from './pongi-whack-audio'
import { GoldIcon } from '@/features/gold/gold-provider'
import { GoldChange } from '@/features/gold/gold-change'
import { playRewardSound } from '@/features/gold/purchase-sound'
import { useEquippedRelic } from '@/features/relics/use-equipped-relic'

const art = '/arcade/pongi-whack/'
const names = {
  pongi: '퐁이',
  golden: '황금 퐁이',
  bomb: '폭탄',
  impostor: '퐁순이',
  hay: '건초 퐁이',
  sandcastle: '모래성 퐁이',
}
type Impact = { id: number; hole: number; kind: WhackTarget['kind']; points: number; at: number }
function WhackRanking() {
  const [offset, setOffset] = useState(0)
  const query = useAccountResource(['pongi-whack-ranking', offset], (signal) =>
    readWhackRanking(signal, offset),
  )
  return (
    <div
      className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
      role="tabpanel"
      id="pongi-whack-rank-panel"
      aria-labelledby="pongi-whack-rank-tab"
    >
      <div className="flex items-center justify-between">
        <h3>이번 주 최고 기록</h3>
        <Button variant="ghost" disabled={query.isFetching} onClick={() => void query.refetch()}>
          새로고침
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        높은 점수 → 적은 오답 → 먼저 완료한 기록 순서예요.
      </p>
      <WeeklyRewards rewards={query.data?.rewards} weekEnd={query.data?.weekEnd} />
      <ol className={rankingListClass}>
        {query.data?.rows.map((row) => (
          <RankingRow
            key={row.id}
            {...row}
            action={<RankingFriendAction player={row} />}
            record={<span>{(row as typeof row & { score: number }).score}점</span>}
          />
        ))}
      </ol>
      {query.data?.total === 0 && (
        <p className="py-6 text-center text-sm">이번 주 첫 기록에 도전해보세요.</p>
      )}
      {query.error && (
        <p role="alert" className="text-xs text-destructive">
          {whackError(query.error)}
        </p>
      )}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          이전
        </Button>
        <Button
          variant="ghost"
          disabled={!query.data || offset + 20 >= query.data.total}
          onClick={() => setOffset(offset + 20)}
        >
          다음
        </Button>
      </div>
    </div>
  )
}
export default function PongiWhackGame() {
  const { session } = useAuth()
  return <PongiWhackSession key={session?.user.id ?? 'guest'} signedIn={!!session} />
}
function PongiWhackSession({ signedIn }: { signedIn: boolean }) {
  const equippedRelic = useEquippedRelic()
  const goldenCount = equippedRelic?.effect_kind === 'pongi_whack_golden_count'
    && [2,4,10].includes(equippedRelic.effect_value) ? equippedRelic.effect_value : 1
  const query = useAccountResource('pongi-whack', readWhack)
  const [tab, setTab] = useState<'game' | 'rank'>('game'),
    [run, setRun] = useState<WhackRun | null>(null)
  const [practice, setPractice] = useState(false),
    [elapsed, setElapsed] = useState(-3000),
    [hits, setHits] = useState<WhackHit[]>([])
  const [phase, setPhase] = useState<'playing' | 'submitting' | 'retry' | 'done'>('playing'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const [feedback, setFeedback] = useState<Impact[]>([])
  const audio = useRef<ReturnType<typeof createWhackAudio> | null>(null)
  const duration = run?.durationMs ?? WHACK_DURATION
  const remaining = Math.max(0, duration - Math.max(0, elapsed))
  const [goldEffect, setGoldEffect] = useState<{ id: string; gold: number } | null>(null)
  const celebrated = useRef(new Set<string>())
  useEffect(() => {
    if (!goldEffect) return
    const timer = setTimeout(() => setGoldEffect(null), 1400)
    return () => clearTimeout(timer)
  }, [goldEffect])
  const [confirm, setConfirm] = useState(false),
    [container, setContainer] = useState<HTMLDialogElement | null>(null)
  const clock = useRef(0),
    taps = useRef<WhackHit[]>([]),
    lock = useRef(false),
    startOperation = useRef<string | null>(null),
    alive = useRef(true),
    submitted = useRef(false)
  useEffect(() => {
    alive.current = true
    for (const kind of ['pongi-hit', 'golden-hit', 'impostor-hit', 'hay', 'hay-hit', 'sandcastle', 'sandcastle-hit']) {
      const img = new Image()
      img.src = art + kind + '.webp'
    }
    return () => {
      alive.current = false
      audio.current?.dispose()
      audio.current = null
    }
  }, [])
  const score = scoreWhack(run?.targets ?? [], hits)
  const resumable =
    query.data?.run && !query.data.run.finishedAt && !query.data.run.abandoned
      ? query.data.run
      : null
  async function resume() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const state = await actWhack({ p_action: 'state' })
      if (alive.current && state.run) open(state.run, false, state.serverNow)
    } catch (e) {
      if (alive.current) setError(whackError(e))
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  function open(next: WhackRun, isPractice: boolean, serverNow: string) {
    taps.current = []
    setHits([])
    submitted.current = false
    setFeedback([])
    setGoldEffect(null)
    setError('')
    setPractice(isPractice)
    clock.current = performance.now() + Date.parse(next.startedAt) - Date.parse(serverNow)
    setElapsed(-3000)
    setPhase(next.finishedAt ? 'done' : 'playing')
    setRun(next)
  }
  async function start(isPractice: boolean) {
    if (lock.current) return
    if (isPractice) {
      const now = Date.now()
      open(
        {
          id: randomId(),
          startedAt: new Date(now + 3000).toISOString(),
          targets: practiceWhack(Math.random, goldenCount),
          finishedAt: null,
          abandoned: false,
          score: 0,
          mistakes: 0,
          durationMs: WHACK_DURATION,
        },
        true,
        new Date(now).toISOString(),
      )
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      startOperation.current ??= randomId()
      const state = await actWhack({ p_action: 'start', p_operation_id: startOperation.current })
      if (alive.current && state.run) {
        open(state.run, false, state.serverNow)
        setConfirm(false)
        startOperation.current = null
      }
    } catch (e) {
      if (alive.current) setError(whackError(e))
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  async function finish() {
    if (!run || lock.current) return
    submitted.current = true
    if (practice) {
      setPhase('done')
      return
    }
    lock.current = true
    setPhase('submitting')
    setError('')
    try {
      const state = await actWhack({ p_action: 'finish', p_run_id: run.id, p_hits: taps.current })
      if (alive.current) {
        setRun(state.run)
        setPhase('done')
        if (state.run && (state.run.rewardGold ?? 0) > 0 && !celebrated.current.has(state.run.id)) {
          celebrated.current.add(state.run.id)
          setGoldEffect({ id: state.run.id, gold: state.run.rewardGold! })
          playRewardSound('pongi-whack:' + state.run.id)
        }
      }
    } catch (e) {
      if (alive.current) {
        setError(whackError(e))
        setPhase('retry')
      }
    } finally {
      lock.current = false
    }
  }
  useEffect(() => {
    if (!run || phase !== 'playing') return
    let frame = 0
    function tick() {
      const ms = performance.now() - clock.current
      setElapsed(Math.min(duration, ms))
      if (ms >= duration) {
        if (!submitted.current) void finish()
      } else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [run?.id, phase]) // Timed play uses a monotonic clock; backgrounding never pauses a ranked run.
  function hit(target: WhackTarget) {
    const ms = Math.floor(performance.now() - clock.current),
      last = taps.current.at(-1)
    if (
      phase !== 'playing' ||
      ms >= duration ||
      ms < target.at + 80 ||
      ms >= target.until ||
      taps.current.some((h) => h.id === target.id) ||
      (last && ms - last.ms < 60)
    )
      return
    const next = { id: target.id, ms }
    taps.current = [...taps.current, next]
    setHits(taps.current)
    setFeedback((old) => [
      ...old.filter((f) => ms - f.at < 550),
      {
        id: target.id,
        hole: target.hole,
        kind: target.kind,
        points: whackPoints(target.kind),
        at: ms,
      },
    ])
    audio.current ??= createWhackAudio()
    audio.current.play(target.kind)
  }
  async function leave() {
    if (run && !practice && !run.finishedAt) {
      await actWhack({ p_action: 'leave', p_run_id: run.id })
    }
    if (alive.current) {
      setRun(null)
      setConfirm(false)
      setError('')
    }
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GameTabs id="pongi-whack" value={tab} onChange={setTab} />
      {tab === 'rank' ? (
        <WhackRanking />
      ) : (
        <div
          className="relative min-h-0 flex-1"
          role="tabpanel"
          id="pongi-whack-game-panel"
          aria-labelledby="pongi-whack-game-tab"
        >
          <GameStartOverlay
            title="퐁이 잡기"
            description="진짜 퐁이를 찾는 30초의 집중!"
            poster={art + 'thumbnail-clean.webp'}
            onPaid={() => {
              setError('')
              setConfirm(true)
            }}
            onPractice={() => void start(true)}
            paidDisabled={busy || !signedIn || !!resumable}
            practiceDisabled={busy}
            fee={10}
            extraPanel={
              resumable || error ? (
                <div className="space-y-2 bg-background px-3 py-2 text-center text-xs">
                  {resumable && (
                    <Button variant="secondary" disabled={busy} onClick={() => void resume()}>
                      진행 중인 실전 이어하기
                    </Button>
                  )}
                  {error && (
                    <p role="alert" className="text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              ) : undefined
            }
          >
            <div className="grid grid-cols-2 gap-2 text-left">
              {(
                [
                  { kind: 'pongi', name: '퐁이', score: '+1' },
                  { kind: 'impostor', name: '퐁순이', score: '−2' },
                  { kind: 'hay', name: '건초더미', score: '−2' },
                  { kind: 'sandcastle', name: '모래성 퐁이', score: '−2' },
                  { kind: 'golden', name: '황금 퐁이', score: '+10' },
                ] as const
              ).map((item) => (
                <div key={item.kind} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/20 bg-black/30 px-2 py-1.5">
                  <img src={art + item.kind + '.webp'} alt={item.name} width={36} height={36} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                  <p className="text-[11px] leading-4 text-white">
                    {item.name}
                    <br />
                    <strong className={item.score.startsWith('−') ? 'text-red-200' : 'text-amber-200'}>
                      {item.score}점
                    </strong>
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {goldenCount>1&&<><span className="text-amber-200">유물 효과 · 황금 퐁이 총 {goldenCount}마리</span><br /></>}
              퐁순이·건초·모래성은 피하세요!
              <br />
              최종 점수만큼 골드 지급
              <br />
              실전 최고 기록은 주간 랭킹에 반영
            </p>
          </GameStartOverlay>
        </div>
      )}
      <div className={run || confirm ? 'contents' : 'hidden'}>
        <GameModal
          open={!!run || confirm}
          title="퐁이 잡기"
          active={!!run && phase !== 'done'}
          practice={practice}
          busy={busy || phase === 'submitting'}
          onContainer={setContainer}
          onExit={leave}
          exitDescription="종료하면 이번 기록은 순위에 반영되지 않아요. 실전 참가비는 반환되지 않으며 시간은 계속 흘러요."
        >
          {run && (
            <div
              className={`whack-game ${feedback.some((f) => f.kind === 'bomb' && elapsed - f.at < 280) ? 'whack-shake' : ''}`}
            >
              <div className="whack-hud">
                <div className="whack-score">
                  <span className="whack-hud-label">현재 점수</span>
                  <strong key={hits.length} className="whack-score-value" aria-label="현재 점수">
                    {phase === 'done' && !practice ? run.score : score.score}
                    <small>점</small>
                  </strong>
                </div>
                <div className={`whack-clock ${remaining <= 5000 ? 'whack-hurry' : ''}`}>
                  <span className="whack-hud-label">남은 시간</span>
                  <strong>
                    {(remaining / 1000).toFixed(1)}
                    <small>초</small>
                  </strong>
                </div>
              </div>
              <div className="whack-progress-wrap">
                <div
                  className={`whack-progress ${elapsed >= duration - 5000 ? 'whack-progress-hurry' : ''}`}
                  role="progressbar"
                  aria-label="남은 시간"
                  aria-valuemin={0}
                  aria-valuemax={duration / 1000}
                  aria-valuenow={Number((remaining / 1000).toFixed(1))}
                >
                  <i
                    style={{
                      transform: `scaleX(${remaining / duration})`,
                      background: `hsl(${Math.round((100 * remaining) / duration)} 48% 58%)`,
                    }}
                  />
                </div>
                <img
                  className="whack-time-marker"
                  src={art + 'clock.webp'}
                  alt=""
                  style={{ left: `${(remaining / duration) * 100}%` }}
                />
              </div>
              <div className="whack-obstacles" role="group" aria-label="피해야 할 방해물 · 누르면 2점 감점">
                <span className="whack-obstacles-label">피하세요 <b>−2</b></span>
                {(['impostor', 'hay', 'sandcastle'] as const).map(kind=>(
                  <img key={kind} src={art + kind + '.webp'} alt={names[kind]} width={32} height={32} draggable={false}/>
                ))}
              </div>
              <div className="whack-board" aria-label="퐁이 잡기 구멍 12개">
                {Array.from({ length: WHACK_HOLES }, (_, hole) => {
                  const impact = feedback.find((f) => f.hole === hole && elapsed - f.at < 420)
                  const target =
                    run.targets.find(
                      (t) => t.hole === hole && elapsed >= t.at && elapsed < t.until,
                    ) ?? (impact ? run.targets.find((t) => t.id === impact.id) : undefined)
                  const caught = target && hits.some((h) => h.id === target.id)
                  const reaction = target && feedback.find((f) => f.id === target.id)
                  const age = target ? Math.max(0, elapsed - target.at) : 0
                  const motion = whackMotion(target?.at ?? 0)
                  const rise = 1 - Math.pow(1 - Math.min(1, age / motion.riseMs), 3)
                  const sink = target
                    ? Math.min(
                        1,
                        Math.max(0, (elapsed - target.until + motion.sinkMs) / motion.sinkMs),
                      ) ** 2
                    : 0
                  const y = reaction
                    ? Math.min(1, Math.max(0, (elapsed - reaction.at - 220) / 180)) ** 2 * 110
                    : (1 - rise + sink) * 110
                  return (
                    <div key={hole} className="whack-hole">
                      <img
                        className="whack-hole-art"
                        src={art + 'hole.webp'}
                        alt=""
                        draggable={false}
                      />
                      <div className="whack-mouth">
                        {target && (
                          <button
                            key={target.id}
                            type="button"
                            className={`whack-target ${caught ? 'whack-caught' : ''}`}
                            style={{ transform: `translateY(${y}%)` }}
                            disabled={!!caught || phase !== 'playing'}
                            aria-label={`${hole + 1}번 구멍 ${names[target.kind]}`}
                            onPointerDown={(e) => {
                              if (e.button !== 0) return
                              e.preventDefault()
                              hit(target)
                            }}
                            onClick={(e) => {
                              if (e.detail === 0) hit(target)
                            }}
                          >
                            <img
                              className={caught ? 'whack-bonk' : ''}
                              src={
                                art +
                                target.kind +
                                (caught && target.kind !== 'bomb' ? '-hit' : '') +
                                '.webp'
                              }
                              alt=""
                              draggable={false}
                              style={
                                caught && target.kind === 'bomb'
                                  ? { visibility: 'hidden' }
                                  : undefined
                              }
                            />
                          </button>
                        )}
                      </div>
                      {feedback
                        .filter((f) => f.hole === hole && elapsed - f.at < 500)
                        .map((f) => (
                          <div
                            key={'fx' + f.id}
                            className={`whack-impact whack-impact-${f.kind}`}
                            aria-hidden="true"
                          >
                            <i className="whack-ring" />
                            {Array.from({ length: f.kind === 'bomb' ? 7 : 5 }, (_, i) => (
                              <i
                                key={i}
                                className="whack-particle"
                                style={
                                  {
                                    '--dx': `${Math.cos(i * 2.4) * 48}px`,
                                    '--dy': `${Math.sin(i * 2.4) * 40 - 12}px`,
                                    '--spin': `${i * 65}deg`,
                                  } as React.CSSProperties
                                }
                              />
                            ))}
                          </div>
                        ))}
                      {feedback
                        .filter((f) => f.hole === hole && elapsed - f.at < 500)
                        .map((f) => (
                          <span
                            key={f.id}
                            className={`whack-feedback ${f.points < 0 ? 'whack-bad' : ''}`}
                          >
                            {f.points > 0 ? '+' : ''}
                            {f.points}
                          </span>
                        ))}
                    </div>
                  )
                })}
                {elapsed < 0 && phase === 'playing' && (
                  <div className="whack-countdown" aria-live="polite">
                    {Math.ceil(-elapsed / 1000)}
                    <small>준비하세요!</small>
                  </div>
                )}
              </div>
              {phase !== 'playing' && (
                <div className="whack-result" role="status">
                  <h3>
                    {phase === 'submitting'
                      ? '기록 확인 중…'
                      : phase === 'retry'
                        ? '기록 제출을 다시 확인해주세요'
                        : practice
                          ? '연습 완료!'
                          : '도전 완료!'}
                  </h3>
                  <strong>{phase === 'done' && !practice ? run.score : score.score}점</strong>
                  <p>
                    정확도{' '}
                    {hits.length
                      ? Math.round(((hits.length - score.mistakes) / hits.length) * 100)
                      : 0}
                    % · 오답 {score.mistakes}회
                  </p>
                  <p>
                    {practice
                      ? '연습 기록은 순위에 반영되지 않아요.'
                      : '이번 주 최고 기록으로 순위에도 반영돼요.'}
                  </p>
                  {!practice && phase === 'done' && (
                    <p className="flex items-center justify-center gap-1 text-primary">
                      <GoldIcon className="size-5" />
                      {run.rewardGold ?? 0} 지급 완료
                    </p>
                  )}
                  {error && <p role="alert">{error}</p>}
                  {phase === 'retry' ? (
                    <Button onClick={() => void finish()}>같은 기록 다시 제출</Button>
                  ) : (
                    phase === 'done' && (
                      <Button
                        onClick={() => {
                          setRun(null)
                          setError('')
                        }}
                      >
                        시작 화면으로
                      </Button>
                    )
                  )}
                </div>
              )}
              {goldEffect && (
                <div
                  className="whack-gold-effect"
                  key={goldEffect.id}
                  aria-label={`골드 ${goldEffect.gold} 획득`}
                >
                  <GoldChange delta={goldEffect.gold} />
                </div>
              )}
            </div>
          )}
        </GameModal>
      </div>
      <ConfirmDialog
        open={confirm}
        portalContainer={container}
        onOpenChange={setConfirm}
        title="퐁이 잡기 실전에 참가할까요?"
        description="참가비 10골드가 소모돼요. 중도 종료 시 반환되지 않으며, 완료한 최고 기록만 주간 순위에 반영돼요."
        illustration="game"
        busy={busy}
        error={error}
        onConfirm={() => void start(false)}
      />
    </div>
  )
}
