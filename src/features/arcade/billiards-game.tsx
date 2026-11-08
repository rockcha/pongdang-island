import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'
import { GameTabs, GameStartOverlay, type GameTab } from './game-controls'
import { GameModal } from './game-modal'
import { createBilliards } from './billiards-model'
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
}: {
  best: number | null
  paused: boolean
  onFinish: (score: number) => void
  onRetry: () => void
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
    const state = createBilliards()
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
                onFinish(state.score)
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
  }, [onFinish])
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
            {error && <button onClick={onRetry}>다시 시도</button>}
          </div>
        )}
        {hud.phase === 'lost' && (
          <div className="billiards-result" role="status">
            <Trophy size={36} />
            <p className="billiards-result-label">도전 종료</p>
            <h2>{hud.score}점</h2>
            <p>
              {best !== null && best > hud.score
                ? `이번 방문 최고 ${best}점`
                : '이번 방문 최고 기록'}
            </p>
            <button onClick={onRetry}>다시 도전</button>
          </div>
        )}
      </div>
      <p className="billiards-message" aria-live="polite">
        {hud.phase === 'aim' && hud.shotCount > 0 ? hud.message : ''}
      </p>
    </div>
  )
}

export default function BilliardsGame() {
  const [tab, setTab] = useState<GameTab>('game')
  const [best, setBest] = useState<number | null>(null)
  const onFinish = useCallback(
    (score: number) => setBest((value) => (value === null ? score : Math.max(value, score))),
    [],
  )
  const [run, setRun] = useState(0)
  const [open, setOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  return (
    <section className="billiards-page">
      <GameTabs id="billiards" value={tab} onChange={setTab} />
      <div
        id="billiards-rank-panel"
        role="tabpanel"
        aria-labelledby="billiards-rank-tab"
        hidden={tab !== 'rank'}
      >
        {tab === 'rank' && (
          <div className="billiards-menu">
            <Trophy size={36} />
            <h2>랭킹 준비 중</h2>
            <p>지금은 연습 모드만 이용할 수 있어요.</p>
          </div>
        )}
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
            paidLabel="실전 · 준비 중"
            paidDisabled
            onPaid={() => {}}
            practiceLabel="연습 시작"
            fee={0}
            onPractice={() => {
              setRun((n) => n + 1)
              setPaused(false)
              setOpen(true)
            }}
          >
            <p className="text-sm">♥ 목숨 5개로 최고 기록 도전</p>
            <p className="text-xs text-white/75">
              이번 방문 최고 {best === null ? '—' : best + '점'} · 무료 연습
            </p>
            <p className="text-xs text-white/60">즉시 지급 + 정산 예정 · 현재 연습 보상 없음</p>
          </GameStartOverlay>
        )}
      </div>
      <div hidden={!open} className={open ? 'contents' : 'hidden'}>
        <GameModal
          open={open}
          title="퐁이 당구"
          active
          practice
          onPause={setPaused}
          onExit={() => setOpen(false)}
        >
          {open && (
            <Practice
              key={run}
              best={best}
              paused={paused}
              onRetry={() => setRun((n) => n + 1)}
              onFinish={onFinish}
            />
          )}
        </GameModal>
      </div>
    </section>
  )
}
