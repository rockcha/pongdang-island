import { RankingFriendAction } from './ranking-friend-action'
import { GamePanel, GameStage, GameActions } from './game-layout'
import { RankingRow, rankingListClass } from './ranking-row'
import { randomId } from '@/lib/random-id'
import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { GameStartOverlay, GameTabs } from './game-controls'
import { GameModal } from './game-modal'
import {
  oddEvenAction,
  oddEvenError,
  oddEvenLeaderboard,
  type OddEvenAction,
  type OddEvenState,
  type OddEvenRanks,
} from './odd-even-api'
import { createOddEvenPractice } from './odd-even-practice'
import { OddEvenActor, type OddEvenScene } from './odd-even-actor'
import './odd-even-game.css'

function Ranking() {
  const [data, setData] = useState<OddEvenRanks | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const alive = useRef(true),
    locked = useRef(false)
  async function load(offset = 0) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      const next = await oddEvenLeaderboard(offset)
      if (alive.current) {
        setData((old) => ({
          ...next,
          rows: offset && old ? [...old.rows, ...next.rows] : next.rows,
        }))
        setError('')
      }
    } catch (cause) {
      if (alive.current) setError(oddEvenError(cause))
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }
  useEffect(() => {
    alive.current = true
    void load()
    return () => {
      alive.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      role="tabpanel"
      id="odd-even-rank-panel"
      aria-labelledby="odd-even-rank-tab"
      className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-normal">최고 수령액</h3>
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
      <p className="text-xs text-muted-foreground">실제 받은 보상 기준 · 개인 최고 기록</p>
      <ol className={rankingListClass}>
        {data?.rows.map((row) => (
          <RankingRow
            key={row.id}
            rank={row.rank}
            nickname={row.nickname}
            avatarPath={row.avatarPath}
            level={row.level}
            levelProgress={row.levelProgress}
            mine={row.mine}
            record={
              <span className="flex items-center justify-end gap-1">
                <GoldIcon className="size-4" />
                <span>{row.gold.toLocaleString('ko-KR')}</span>
              </span>
            }
            action={<RankingFriendAction player={row} />}
          />
        ))}
      </ol>
      {data && !data.total && (
        <p className="py-6 text-center text-sm text-muted-foreground">아직 수령 기록이 없어요.</p>
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
export default function OddEvenGame() {
  const { session } = useAuth()
  return <AccountGame key={session?.user.id ?? 'guest'} />
}
function AccountGame() {
  const [modalContainer, setModalContainer] = useState<HTMLDialogElement | null>(null)
  const [gameOpen, setGameOpen] = useState(false),
    restore = useRef(true)
  const gold = useGold(),
    [state, setState] = useState<OddEvenState>({ run: null, maxWins: 20 }),
    [tab, setTab] = useState<'game' | 'rank'>('game')
  const [practiceMode, setPracticeMode] = useState(false),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false)
  const [scene, setScene] = useState<OddEvenScene>('mixing')
  const alive = useRef(true),
    locked = useRef(false),
    acceptedRunKey = useRef(''),
    operation = useRef<string | null>(null),
    practice = useRef<ReturnType<typeof createOddEvenPractice> | null>(null)
  const run = state.run,
    playing = !!run && (run.stage === 'choose' || run.stage === 'decision')
  const visibleStake =
    run && scene !== 'result' && run.stage === 'decision'
      ? run.stake / 2
      : run && scene !== 'result' && run.stage === 'lost'
        ? (run.initialStake ?? 10) * 2 ** run.wins
        : (run?.stake ?? 0)
  useEffect(() => {
    for (const name of ['mix', 'open']) {
      const image = new Image()
      image.src = `/arcade/odd-even/pongi-${name}-sprite.png`
    }
  }, [])
  useEffect(() => {
    if (!run) return
    if (run.stage === 'banked') {
      setScene('result')
      return
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const choosing = run.stage === 'choose'
    setScene(choosing ? 'mixing' : 'opening')
    const timer = setTimeout(
      () => setScene(choosing ? 'asking' : 'result'),
      reduced ? 0 : choosing ? 1200 : 720,
    )
    return () => clearTimeout(timer)
  }, [run?.id, run?.round, run?.stage]) // eslint-disable-line react-hooks/exhaustive-deps
  async function request(args: OddEvenAction) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      const next = practice.current ? practice.current(args) : await oddEvenAction(args)
      if (!alive.current) return
      // Change the animation with its result, before the next paint. The effect
      // below owns the timer, but must not leave old buttons visible for a frame.
      const nextRunKey = next.run ? `${next.run.id}:${next.run.round}:${next.run.stage}` : ''
      if (nextRunKey !== acceptedRunKey.current) {
        acceptedRunKey.current = nextRunKey
        setScene(
          next.run?.stage === 'banked'
            ? 'result'
            : next.run?.stage === 'choose'
              ? 'mixing'
              : 'opening',
        )
      }
      setState(next)
      setError('')
      setLoaded(true)
      if (restore.current) {
        restore.current = false
        if (next.run && ['choose', 'decision'].includes(next.run.stage)) setGameOpen(true)
      }
      if (args.p_action === 'start') {
        setGameOpen(true)
        operation.current = null
        setConfirm(false)
      }
      if (!practice.current && (args.p_action === 'start' || args.p_action === 'cashout'))
        void gold.refresh()
      if (args.p_action === 'cashout' && next.run?.stage === 'banked')
        toast.success(
          practice.current
            ? '연습 보상을 받았어요.'
            : `${next.run.stake.toLocaleString('ko-KR')}골드를 받았습니다.`,
        )
    } catch (cause) {
      if (alive.current) {
        setError(oddEvenError(cause))
        setLoaded(true)
        if (args.p_action === 'answer') setScene('asking')
      }
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }
  useEffect(() => {
    alive.current = true
    void request({ p_action: 'state' })
    const reload = () => {
      if (!practice.current && !operation.current && document.visibilityState === 'visible')
        void request({ p_action: 'state' })
    }
    window.addEventListener('focus', reload)
    window.addEventListener('online', reload)
    return () => {
      alive.current = false
      window.removeEventListener('focus', reload)
      window.removeEventListener('online', reload)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  function startPaid() {
    practice.current = null
    setPracticeMode(false)
    operation.current ??= randomId()
    void request({ p_action: 'start', p_operation_id: operation.current })
  }
  function startPractice() {
    if (locked.current || operation.current) return
    practice.current = createOddEvenPractice()
    setPracticeMode(true)
    void request({ p_action: 'start' })
  }
  function act(p_action: OddEvenAction['p_action'], p_choice?: 'odd' | 'even') {
    if (!run || locked.current) return
    if (p_action === 'answer') {
      if (scene !== 'asking') return
      setScene('submitting')
    }
    if (p_action === 'double' && scene !== 'result') return
    void request({ p_action, p_run_id: run.id, p_round: run.round, p_choice })
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <GameTabs id="odd-even" value={tab} onChange={setTab} />
      {tab === 'rank' ? (
        <Ranking />
      ) : (
        <GameModal
          onContainer={setModalContainer}
          open={gameOpen}
          title="퐁이의 홀짝 조개"
          active={playing}
          practice={practiceMode}
          busy={busy}
          exitDescription={
            practiceMode
              ? '나가면 연습 진행이 사라져요.'
              : '실전 진행과 확보 금액은 보관돼요. 돌아와 이어할 수 있어요.'
          }
          onExit={() => {
            setGameOpen(false)
            if (practiceMode) {
              setState({ run: null, maxWins: 20 })
              practice.current = null
            }
          }}
        >
          <GamePanel
            id="odd-even"
            className="relative overflow-hidden border-b border-border bg-card"
          >
            {!run || !gameOpen ? (
              <GameStartOverlay
                rules={[
                  '조개 속 진주의 개수가 홀수인지 짝수인지 고르세요.',
                  '맞히면 현재 베팅금이 두 배가 돼요. 보상을 받거나 다음 판에 도전할 수 있어요.',
                  '틀리면 이번 게임의 베팅금을 모두 잃어요.',
                ]}
                title="퐁이의 홀짝 조개"
                description="조개 속 진주, 홀일까요 짝일까요?"
                poster="/arcade/odd-even/thumbnail.png"
                onPaid={() => {
                  setGameOpen(true)
                  setConfirm(true)
                }}
                onPractice={startPractice}
                paidDisabled={!loaded || busy || gold.loading || gold.wallet.gold < 30}
                practiceDisabled={busy || !!operation.current}
              />
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-2 p-3 sm:p-4">
                <div className="shrink-0 text-center">
                  <p className="text-xs text-muted-foreground">
                    {run.stage === 'banked'
                      ? '받은 보상'
                      : scene !== 'result'
                        ? '현재 배팅금'
                        : '현재 확보 금액'}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-3xl tabular-nums text-primary">
                    <GoldIcon className="size-7" />
                    {visibleStake.toLocaleString('ko-KR')}
                  </p>
                  <p className="min-h-4 text-xs text-muted-foreground">
                    {run.stage === 'choose' ? '맞히면 두 배' : null}
                  </p>
                </div>
                <GameStage
                  aria-live="polite"
                  className={`odd-even-scene relative flex min-h-0 flex-1 flex-col items-center gap-1 rounded-lg p-2 ${scene === 'result' && run.stage === 'lost' ? 'odd-even-result--wrong bg-red-50 text-red-800' : scene === 'result' && (run.stage === 'decision' || run.stage === 'banked') ? 'odd-even-result--correct bg-emerald-50 text-emerald-800' : 'bg-secondary/40 text-primary'}`}
                >
                  <OddEvenActor scene={scene} pearls={run.pearls} />
                  {scene === 'result' && (run.stage === 'decision' || run.stage === 'lost') && (
                    <div
                      key={run.id + '-' + run.round}
                      aria-hidden="true"
                      className={`odd-even-feedback pointer-events-none absolute inset-0 z-10 grid place-items-center ${run.stage === 'lost' ? 'text-[#df554c]' : 'text-[#32a766]'}`}
                    >
                      <svg
                        viewBox="0 0 240 240"
                        className="h-[min(65%,13rem)] w-[min(65%,13rem)] overflow-visible drop-shadow-[0_2px_8px_rgba(255,255,255,0.7)]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="16"
                        strokeLinecap="round"
                      >
                        {run.stage === 'lost' ? (
                          <path d="m60 60 120 120M180 60 60 180" />
                        ) : (
                          <circle cx="120" cy="120" r="85" />
                        )}
                      </svg>
                    </div>
                  )}
                  <div className="flex h-12 shrink-0 flex-col items-center justify-center gap-1">
                    {scene === 'result' && run.pearls !== null ? (
                      <>
                        <p className="text-base">
                          진주 {run.pearls}개 · {run.pearls % 2 ? '홀' : '짝'}
                        </p>
                        <p className="text-xs">
                          {run.stage === 'lost'
                            ? '아쉬워요!'
                            : run.stage === 'banked'
                              ? '보상 수령 완료'
                              : '맞혔어요!'}
                        </p>
                      </>
                    ) : scene === 'asking' ? (
                      <p className="text-sm">홀일까요, 짝일까요?</p>
                    ) : (
                      <span className="sr-only">
                        {scene === 'mixing' ? '퐁이가 진주를 섞고 있어요.' : '조개를 열고 있어요.'}
                      </span>
                    )}
                  </div>
                </GameStage>
                <GameActions
                  revealed={scene !== 'mixing'}
                  className="odd-even-actions grid grid-cols-2 gap-2"
                >
                  {run.stage === 'choose' || scene !== 'result' ? (
                    <>
                      <Button
                        className="h-full min-h-20 w-full min-w-0 text-3xl font-medium"
                        disabled={busy || run.stage !== 'choose' || scene !== 'asking'}
                        onClick={() => act('answer', 'odd')}
                      >
                        홀
                      </Button>
                      <Button
                        className="h-full min-h-20 w-full min-w-0 text-3xl font-medium"
                        disabled={busy || run.stage !== 'choose' || scene !== 'asking'}
                        variant="outline"
                        onClick={() => act('answer', 'even')}
                      >
                        짝
                      </Button>
                    </>
                  ) : run.stage === 'decision' ? (
                    <>
                      <Button
                        className={run.wins >= state.maxWins ? 'col-span-2' : undefined}
                        disabled={busy || scene !== 'result'}
                        onClick={() => act('cashout')}
                      >
                        보상 받기
                      </Button>
                      {run.wins < state.maxWins && (
                        <Button
                          variant="outline"
                          disabled={busy || scene !== 'result'}
                          onClick={() => act('double')}
                        >
                          묻고 더블로 가 !
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      className="col-span-2 text-lg font-medium"
                      disabled={busy || scene !== 'result'}
                      onClick={() => {
                        setState({ run: null, maxWins: 20 })
                        setError('')
                      }}
                    >
                      다시 하기
                    </Button>
                  )}
                </GameActions>
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="absolute inset-x-2 bottom-2 z-30 rounded-lg border bg-card p-3 text-xs text-destructive"
              >
                {error}
                <Button
                  variant="ghost"
                  className="ml-2 h-7 text-xs"
                  disabled={busy}
                  onClick={() =>
                    operation.current ? startPaid() : void request({ p_action: 'state' })
                  }
                >
                  다시 확인
                </Button>
              </div>
            )}
          </GamePanel>
        </GameModal>
      )}
      <ConfirmDialog
        portalContainer={modalContainer}
        illustration="game"
        open={confirm}
        onOpenChange={(open) => {
          setConfirm(open)
          if (!open) setGameOpen(false)
        }}
        title="30골드로 시작하시겠습니까?"
        description="별도 참가비 없이 30골드를 베팅해요. 틀리면 이번 판의 베팅금은 사라져요."
        busy={busy}
        onConfirm={startPaid}
      />
    </div>
  )
}
