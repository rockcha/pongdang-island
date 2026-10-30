import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Shield,
  Clock3,
  Pause,
  Play,
  Target,
  Waves,
  RotateCcw,
  ArrowUp,
  Coins,
  Maximize2,
  X,
  Smartphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GameTabs, type GameTab } from './game-controls'
import { GameModal } from './game-modal'
import { TowerArt } from './tower-defense-art'
import {
  BUILDINGS,
  MAX_WAVES,
  GRID,
  CELL_COUNT,
  cellAt,
  rangeOf,
  beginDefense,
  build,
  canPlace,
  createDefense,
  pauseDefense,
  sell,
  upgrade,
  upgradeCost,
  waveHint,
  startWave,
  type BuildKind,
} from './tower-defense-engine'
import './tower-defense.css'

type Best = { wave: number; score: number; won: boolean }
// Keep records separate from the former single-gate, larger-wave practice rules.
const key = 'pongdang:tower-defense:practice-best:v2'
function readBest(): Best | null {
  try {
    const b = JSON.parse(localStorage.getItem(key) ?? 'null')
    return b &&
      Number.isInteger(b.wave) &&
      b.wave >= 0 &&
      b.wave <= 5 &&
      Number.isInteger(b.score) &&
      b.score >= 0 &&
      b.score < 1000000 &&
      typeof b.won === 'boolean'
      ? b
      : null
  } catch {
    return null
  }
}
function portraitScreen() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(orientation: portrait)').matches &&
    window.innerWidth < 900
  )
}
export default function TowerDefenseGame() {
  const [initial] = useState(createDefense)
  const state = useRef(initial),
    host = useRef<HTMLDivElement>(null),
    selection = useRef<number | null>(null),
    ownedFullscreen = useRef(false),
    completed = useRef(false)
  const [hud, setHud] = useState(() => ({ ...initial })),
    [open, setOpen] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [tab, setTab] = useState<GameTab>('game'),
    [tool, setTool] = useState<BuildKind>('shell'),
    [selected, setSelected] = useState<number | null>(null),
    [best, setBest] = useState(readBest)
  const [portrait, setPortrait] = useState(portraitScreen)
  const sync = useCallback(() => {
    const s = state.current
    if ((s.phase === 'won' || s.phase === 'lost') && !completed.current) {
      completed.current = true
      const record = { wave: s.wave, score: s.score, won: s.phase === 'won' }
      const previous = readBest()
      if (
        !previous ||
        record.wave > previous.wave ||
        (record.wave === previous.wave &&
          ((record.won && !previous.won) ||
            (record.won === previous.won && record.score > previous.score)))
      ) {
        setBest(record)
        try {
          localStorage.setItem(key, JSON.stringify(record))
        } catch {
          /* Practice still works without storage. */
        }
      }
    }
    setHud({ ...s })
  }, [])
  const select = useCallback((cell: number | null) => {
    selection.current = cell
    setSelected(cell)
  }, [])
  const latestTool = useRef<BuildKind>('shell')
  const chooseCell = useCallback(
    (cell: number) => {
      const s = state.current
      if (s.buildings.some((b) => b.cell === cell)) {
        select(cell)
        setError('')
        return
      }
      if (s.phase !== 'build') {
        select(cell)
        return
      }
      const message = canPlace(s, cell, latestTool.current)
      if (message) {
        setError(message)
        return
      }
      build(s, cell, latestTool.current)
      select(cell)
      setError('')
      sync()
    },
    [select, sync],
  )
  useEffect(() => {
    if (!open) return
    let cancelled = false,
      game: { destroy: (canvas: boolean) => void } | undefined
    import('./tower-defense-scene')
      .then(({ mountTowerDefense }) => {
        if (cancelled || !host.current) return
        game = mountTowerDefense(
          host.current,
          () => state.current,
          () => selection.current,
          chooseCell,
          () => {
            if (!cancelled) {
              setReady(true)
              sync()
            }
          },
          () => latestTool.current,
        )
      })
      .catch(() => {
        if (!cancelled) setError('전장을 불러오지 못했어요. 나갔다가 다시 시작해 주세요.')
      })
    const pause = () => {
      pauseDefense(state.current, true)
      sync()
    }
    const visibility = () => {
      if (document.hidden) pause()
    }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancelled = true
      game?.destroy(true)
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [open, chooseCell, sync])
  useEffect(() => {
    if (!open) return
    const check = () => {
      const rotated = portraitScreen()
      setPortrait(rotated)
      if (rotated) {
        pauseDefense(state.current, true)
        sync()
      }
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [open, sync])
  async function fullScreen() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
        ownedFullscreen.current = true
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>
      }
      await orientation?.lock?.('landscape')
    } catch {
      /* The wide layout also works when fullscreen or rotation lock is unavailable. */
    }
  }
  function closeGame() {
    pauseDefense(state.current, true)
    setOpen(false)
    if (ownedFullscreen.current && document.fullscreenElement)
      void document.exitFullscreen().catch(() => {})
    ownedFullscreen.current = false
  }
  function start() {
    state.current = createDefense()
    beginDefense(state.current)
    const rotated = portraitScreen()
    setPortrait(rotated)
    if (rotated) pauseDefense(state.current, true)
    completed.current = false
    select(null)
    latestTool.current = 'shell'
    setTool('shell')
    setError('')
    if (!open) setReady(false)
    sync()
    setOpen(true)
  }
  const building = hud.buildings.find((b) => b.cell === selected),
    ended = hud.phase === 'won' || hud.phase === 'lost',
    active = !ended && hud.phase !== 'ready',
    editable = hud.phase === 'build' && ready
  const kind = building?.kind ?? tool,
    info = BUILDINGS[kind],
    level = building?.level ?? 1
  const radius = (building ? rangeOf(building) : info.range) / GRID.cell
  return (
    <section className="tdp-page" aria-label="타워디펜스 연습 게임">
      <GameTabs id="tower-defense" value={tab} onChange={setTab} />
      {tab === 'game' ? (
        <div
          className="tdp-menu"
          role="tabpanel"
          id="tower-defense-game-panel"
          aria-labelledby="tower-defense-game-tab"
        >
          <img
            className="tdp-poster"
            src="/arcade/tower-defense/thumbnail.svg"
            alt="넓은 섬에서 포탑과 산호 벽으로 금고를 지키는 타워디펜스"
          />
          <div className="tdp-intro">
            <span className="tdp-badge">무료 연습판</span>
            <h2>퐁이의 타워디펜스</h2>
            <p>두 입구에서 찾아오는 손님들로부터 조개금고를 지켜요.</p>
            <div className="tdp-rules">
              <span>
                <Maximize2 size={15} />
                가로 전장
              </span>
              <span>
                <Clock3 size={15} />
                준비 30초
              </span>
              <span>
                <Target size={15} />
                포탑 3종
              </span>
            </div>
            <p className="tdp-note">실제 골드·보상·공식 순위에는 반영되지 않는 연습 게임이에요.</p>
          </div>
          <Button className="tdp-start" onClick={start}>
            연습 시작 <Play size={15} />
          </Button>
        </div>
      ) : (
        <div
          className="tdp-record"
          role="tabpanel"
          id="tower-defense-rank-panel"
          aria-labelledby="tower-defense-rank-tab"
        >
          <Shield size={38} />
          <h2>이 기기의 최고 연습 기록</h2>
          {best ? (
            <>
              <strong>
                {best.score.toLocaleString()}
                <small>점</small>
              </strong>
              <p>{best.won ? '5웨이브 방어 성공' : best.wave + '웨이브 도전'}</p>
            </>
          ) : (
            <p>첫 방어 기록을 남겨 보세요.</p>
          )}
          <p className="tdp-note">기록은 이 브라우저에 저장돼요.</p>
          <Button variant="outline" onClick={() => setTab('game')}>
            게임으로 돌아가기
          </Button>
        </div>
      )}
      <div className={open ? 'contents' : 'hidden'}>
        <GameModal
          open={open}
          title="타워디펜스"
          practice
          active={active}
          modeLabel="무료 연습"
          layout="fullscreen"
          showHeader={false}
          onExit={closeGame}
          onPause={(paused) => {
            pauseDefense(state.current, paused)
            sync()
          }}
        >
          {(exit) =>
            open && (
              <div className="tdp-game">
                <div className="tdp-hud" inert={portrait}>
                  <span className="tdp-game-name">방어 연습</span>
                  <span>
                    <Waves size={15} />
                    <b>{hud.wave || 1}</b>
                    <small>/{MAX_WAVES}</small>
                  </span>
                  <span aria-label={'금고 체력 ' + hud.lives}>
                    <Shield size={15} />
                    <b>{hud.lives}</b>
                  </span>
                  <span className="tdp-gold" aria-label={'건설 골드 ' + hud.gold}>
                    <Coins size={16} />
                    <b>{hud.gold}</b>
                  </span>
                  <span className="tdp-score" aria-label={'점수 ' + hud.score}>
                    {hud.score.toLocaleString()}
                    <small>점</small>
                  </span>
                  <button
                    className="tdp-pause"
                    aria-label={hud.phase === 'paused' ? '계속하기' : '일시정지'}
                    disabled={ended || !ready}
                    onClick={() => {
                      pauseDefense(state.current, hud.phase !== 'paused')
                      sync()
                    }}
                  >
                    {hud.phase === 'paused' ? <Play size={15} /> : <Pause size={15} />}
                  </button>
                  <button
                    className="tdp-pause"
                    aria-label="전체 화면"
                    onClick={() => void fullScreen()}
                  >
                    <Maximize2 size={15} />
                  </button>
                  <button className="tdp-pause" aria-label="게임 나가기" onClick={exit}>
                    <X size={16} />
                  </button>
                </div>
                <div className="tdp-phase" role="status" inert={portrait}>
                  {hud.phase === 'build' ? (
                    <>
                      <Clock3 size={13} />
                      <b>준비 {Math.ceil(hud.prep)}초</b>
                      <span>{waveHint(hud.wave + 1)}</span>
                    </>
                  ) : (
                    <>
                      <Waves size={13} />
                      <b>
                        {ended ? '방어 종료' : hud.phase === 'paused' ? '잠시 쉬는 중' : '습격 중'}
                      </b>
                      <span>{hud.kills}마리 처치</span>
                    </>
                  )}
                </div>
                <div className="tdp-board" inert={portrait}>
                  <div
                    ref={host}
                    className="tdp-canvas"
                    tabIndex={0}
                    role="application"
                    aria-label="오른쪽 두 입구에서 찾아오는 적을 막는 가로 전장. 포탑을 고르면 사거리를 미리 볼 수 있어요. 방향키로 칸 이동, Enter로 설치 또는 선택."
                    onKeyDown={(event) => {
                      const offset = {
                        ArrowLeft: -1,
                        ArrowRight: 1,
                        ArrowUp: -GRID.columns,
                        ArrowDown: GRID.columns,
                      }[event.key]
                      if (offset) {
                        event.preventDefault()
                        const current = selection.current ?? cellAt(14, 2),
                          next = current + offset
                        if (
                          next >= 0 &&
                          next < CELL_COUNT &&
                          (Math.abs(offset) !== 1 ||
                            Math.floor(current / GRID.columns) === Math.floor(next / GRID.columns))
                        )
                          select(next)
                      } else if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        chooseCell(selection.current ?? cellAt(14, 2))
                      }
                    }}
                  />
                  {!ready && (
                    <div className="tdp-overlay">
                      <span className="tdp-badge">전장을 준비하는 중…</span>
                    </div>
                  )}
                  {hud.phase === 'paused' && (
                    <div className="tdp-overlay">
                      <div className="tdp-result">
                        <Pause size={30} />
                        <h3>잠깐 쉬어가요</h3>
                        <p>준비 시간과 전투가 멈춰 있어요.</p>
                        <Button
                          onClick={() => {
                            pauseDefense(state.current, false)
                            sync()
                          }}
                        >
                          계속하기
                        </Button>
                      </div>
                    </div>
                  )}
                  {ended && (
                    <div className="tdp-overlay">
                      <div className="tdp-result">
                        <Shield size={35} />
                        <span className="tdp-badge">연습 결과</span>
                        <h3>
                          {hud.phase === 'won'
                            ? '조개금고를 지켰어요!'
                            : '다음엔 한 번 더 버텨봐요'}
                        </h3>
                        <strong>
                          {hud.score.toLocaleString()}
                          <small>점</small>
                        </strong>
                        <p>
                          {hud.wave}웨이브 · {hud.kills}마리 처치
                        </p>
                        {best && <p>이 기기 최고 {best.score.toLocaleString()}점</p>}
                        <Button onClick={start}>
                          <RotateCcw size={14} />
                          다시 연습
                        </Button>
                        <Button variant="ghost" onClick={closeGame}>
                          연습 마치기
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="tdp-controls" inert={portrait}>
                  <div className="tdp-shop" role="group" aria-label="건설 시설">
                    {(Object.keys(BUILDINGS) as BuildKind[]).map((item) => (
                      <button
                        key={item}
                        aria-label={BUILDINGS[item].name + ' ' + BUILDINGS[item].cost + '골드'}
                        aria-pressed={tool === item && !building}
                        disabled={!editable || hud.gold < BUILDINGS[item].cost}
                        onClick={() => {
                          latestTool.current = item
                          setTool(item)
                          select(null)
                          setError('')
                        }}
                      >
                        <TowerArt kind={item} />
                        <b>{BUILDINGS[item].name}</b>
                        <span>
                          <Coins size={11} />
                          {BUILDINGS[item].cost}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="tdp-detail">
                    <div className="tdp-tool-summary">
                      <TowerArt kind={kind} />
                      <div>
                        <b>
                          {info.name}
                          {building && kind !== 'wall' && ' · Lv.' + building.level}
                        </b>
                        <span>{info.role}</span>
                        {kind !== 'wall' && (
                          <dl className="tdp-stats">
                            <div>
                              <dt>사거리</dt>
                              <dd>{Number(radius.toFixed(1))}칸</dd>
                            </div>
                            <div>
                              <dt>공격력</dt>
                              <dd>{Number((info.damage * (1 + (level - 1) * 0.75)).toFixed(1))}</dd>
                            </div>
                            <div>
                              <dt>공격 간격</dt>
                              <dd>
                                {Number((info.interval / (1 + (level - 1) * 0.15)).toFixed(2))}초
                              </dd>
                            </div>
                          </dl>
                        )}
                      </div>
                    </div>
                    {building && (
                      <div className="tdp-actions">
                        {kind !== 'wall' && (
                          <button
                            disabled={
                              !editable || building.level === 3 || hud.gold < upgradeCost(building)
                            }
                            onClick={() => {
                              upgrade(state.current, building.cell)
                              sync()
                            }}
                          >
                            <ArrowUp size={13} />
                            {building.level === 3 ? '최대 강화' : '강화 ' + upgradeCost(building)}
                          </button>
                        )}
                        <button
                          disabled={!editable}
                          onClick={() => {
                            sell(state.current, building.cell)
                            select(null)
                            sync()
                          }}
                        >
                          판매 +{Math.floor(building.spent * 0.7)}
                        </button>
                        <button onClick={() => select(null)}>선택 해제</button>
                      </div>
                    )}
                    <p
                      className={'tdp-help ' + (error ? 'tdp-error' : '')}
                      role={error ? 'alert' : undefined}
                    >
                      {error ||
                        (!ready
                          ? '전장을 불러오고 있어요.'
                          : editable
                            ? '빈 칸에 건설 · 금고까지 가는 길은 열어 두세요.'
                            : '포탑을 누르면 사거리를 확인할 수 있어요.')}
                    </p>
                  </div>
                  <button
                    className="tdp-wave"
                    disabled={!editable}
                    onClick={() => {
                      startWave(state.current)
                      select(null)
                      setError('')
                      sync()
                    }}
                  >
                    <Play size={15} />
                    {hud.phase === 'build'
                      ? '준비 완료 · 바로 시작'
                      : ended
                        ? '방어 종료'
                        : '방어 중'}
                  </button>
                </div>
                {portrait && (
                  <div className="tdp-rotate">
                    <Smartphone size={46} />
                    <h3>가로로 넓게 플레이해요</h3>
                    <p>
                      기기를 가로로 돌려 주세요.
                      <br />
                      준비 시간과 전투는 멈춰 있어요.
                    </p>
                    <Button onClick={() => void fullScreen()}>
                      <Maximize2 size={15} />
                      전체 화면으로 전환
                    </Button>
                    <button onClick={exit}>메뉴로 돌아가기</button>
                  </div>
                )}
              </div>
            )
          }
        </GameModal>
      </div>
    </section>
  )
}
