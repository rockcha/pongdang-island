import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleDot, LockKeyhole, RotateCcw, Trophy } from 'lucide-react'
import { GameModal } from './game-modal'
import { createBilliards } from './billiards-model'
import './billiards.css'

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
    import('./billiards-scene')
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
      <div className="billiards-hud">
        <strong>{hud.score}점</strong>
        <span>
          최고 <b>{best === null ? '—' : `${best}점`}</b>
        </span>
        <span>
          <span aria-label={`남은 목숨 ${hud.lives}개`} style={{ color: '#bd6552' }}>
            {' '}
            {'♥'.repeat(hud.lives)}
            {'♡'.repeat(5 - hud.lives)}{' '}
          </span>
        </span>
        <button onClick={onRetry} aria-label="점수와 목숨을 초기화하여 새로 시작" title="새로 시작">
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="billiards-rule">
        흰 공으로 빨간 공 두 개 맞히기 · 노란 공 −1점 · 실패 시 목숨 −1
      </div>
      <div className="billiards-contact" aria-live="polite">
        {[1, 2].map((id) => (
          <span key={id} className={hud.hits.includes(id) ? 'hit' : ''}>
            🔴 {hud.hits.includes(id) ? '접촉 ✓' : '대기'}
          </span>
        ))}
        <span className={hud.foul ? 'foul' : ''}>🟡 {hud.foul ? '반칙' : '피하기'}</span>
      </div>
      <div className="billiards-board">
        {hud.foul && (
          <div className="billiards-combo" key={hud.shotCount} role="status">
            노란 공 접촉 · −1점
          </div>
        )}
        <div
          ref={host}
          className="billiards-canvas"
          aria-label="흰 공에서 떨어진 곳을 눌러 큐대를 배치하고 당기는 4구 당구대"
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
            <h2>도전 종료 · {hud.score}점</h2>
            <p>이번 방문 최고 기록 {best === null ? hud.score : best}점</p>
            <button onClick={onRetry}>다시 도전 · 목숨 5개</button>
            <small>완료한 게임의 최종 점수로 기록해요. 새로고침하면 기록이 초기화돼요.</small>
          </div>
        )}
      </div>
      <p className="billiards-message" aria-live="polite">
        {hud.message}
      </p>
    </div>
  )
}

export default function BilliardsGame() {
  const [tab, setTab] = useState<'play' | 'ranking'>('play')
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
      <div className="billiards-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'play'} onClick={() => setTab('play')}>
          게임 플레이
        </button>
        <button role="tab" aria-selected={tab === 'ranking'} onClick={() => setTab('ranking')}>
          랭킹
        </button>
      </div>
      {tab === 'ranking' ? (
        <div className="billiards-menu">
          <Trophy size={36} />
          <h2>랭킹 준비 중</h2>
          <p>지금은 연습 모드만 이용할 수 있어요.</p>
        </div>
      ) : (
        <div className="billiards-menu">
          <div className="billiards-hero">
            <CircleDot size={70} />
            <span>5 LIVES CHALLENGE</span>
            <h1>퐁이 당구</h1>
            <p>각도와 힘으로 풀어가는 탑뷰 4구</p>
          </div>
          <span className="billiards-rewards">즉시 지급 + 정산 · 실전 준비 중</span>
          <p>
            흰 공에서 떨어진 곳을 눌러 큐대를 놓고, 더 당겼다가 놓으면 쳐요.
            <br />
            빨간 공 두 개를 맞히면 +1점, 목숨 유지!
            <br />
            실패하면 목숨 −1, 노란 공에 닿으면 추가로 −1점.
          </p>
          <p>
            목숨 5개로 최고 기록에 도전하세요.
            <br />
            이번 방문 최고: {best === null ? '아직 기록 없음' : `${best}점`}
          </p>
          <div className="billiards-start">
            <button disabled>
              <LockKeyhole size={15} /> 실전 준비 중
            </button>
            <button
              onClick={() => {
                setRun((n) => n + 1)
                setPaused(false)
                setOpen(true)
              }}
            >
              연습 시작
            </button>
          </div>
          <small>
            무료 연습 · 골드 지급 및 정산 기록 없음
            <br />
            같은 공 위치에서 계속 진행 · 점수는 음수가 될 수 있어요.
          </small>
        </div>
      )}
      {open && (
        <GameModal
          open
          title="퐁이 당구"
          active
          practice
          onPause={setPaused}
          onExit={() => setOpen(false)}
        >
          <Practice
            key={run}
            best={best}
            paused={paused}
            onRetry={() => setRun((n) => n + 1)}
            onFinish={onFinish}
          />
        </GameModal>
      )}
    </section>
  )
}
