import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Pause,
  Play,
  RotateCcw,
  Waves,
  Shield,
  Shell,
  Plus,
  Zap,
  Fish,
  Anchor,
  ArrowUp,
  Coins,
  FastForward,
  BrickWall,
  LockKeyhole,
  Undo2,
} from 'lucide-react'
import {
  createDefense,
  beginDefense,
  buildTower,
  upgradeTower,
  sellTower,
  startWave,
  upgradeCost,
  towerRange,
  SITES,
  TOWERS,
  waveSize,
  WAVE_NAMES,
  GRID,
  ENTRANCE,
  ISLAND,
  WALL_LIMIT,
  placeWall,
  removeWall,
  previewWall,
  type WallPreview,
  type WallReason,
  type TowerKind,
} from './tide-defense-engine'
import './tide-defense.css'

const icons = { puffer: Fish, net: Anchor, jelly: Zap }
const wallMessages: Record<WallReason, string> = {
  locked: '웨이브 중에는 지형이 고정돼요.',
  invalid: '격자 안의 빈 칸을 골라주세요.',
  endpoint: '입구와 우리 섬에는 벽을 놓을 수 없어요.',
  occupied: '이미 산호벽이 있는 칸이에요.',
  limit: '산호벽 10개를 모두 썼어요. 빈 벽을 회수해보세요.',
  blocked: '길이 완전히 막혀요. 다른 칸을 골라주세요.',
}
export default function TideDefenseGame() {
  const state = useRef(createDefense()),
    host = useRef<HTMLDivElement>(null),
    selection = useRef<number | null>(null),
    preview = useRef<WallPreview | null>(null)
  const [hud, setHud] = useState(createDefense),
    [selected, setSelected] = useState<number | null>(null),
    [hovered, setHovered] = useState<number | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false)
  const sync = () =>
    setHud({ ...state.current, towers: state.current.towers.map((t) => ({ ...t })) })
  const candidate = hovered ?? selected
  const ghost = useMemo(
    () =>
      candidate !== null && !hud.walls.includes(candidate)
        ? previewWall({ phase: hud.phase, walls: hud.walls }, candidate)
        : null,
    [candidate, hud.phase, hud.walls],
  )
  useEffect(() => {
    preview.current = ghost
  }, [ghost])
  useEffect(() => {
    let cancelled = false,
      game: { destroy: (removeCanvas: boolean) => void } | undefined
    import('./tide-defense-scene')
      .then(({ mountDefense }) => {
        if (cancelled || !host.current) return
        game = mountDefense(
          host.current,
          () => state.current,
          () => selection.current,
          () => {
            if (cancelled) return
            setReady(true)
            setHud({ ...state.current, towers: state.current.towers.map((t) => ({ ...t })) })
          },
          () => preview.current,
        )
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    const blur = () => {
      if (state.current.phase === 'playing') {
        state.current.phase = 'paused'
        setHud({ ...state.current })
      }
    }
    const visibility = () => {
      if (document.hidden) blur()
    }
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancelled = true
      game?.destroy(true)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  const select = (site: number | null) => {
    selection.current = site
    setSelected(site)
  }
  const start = () => {
    state.current = createDefense()
    beginDefense(state.current)
    select(null)
    setHovered(null)
    sync()
  }
  const pause = () => {
    const s = state.current
    if (s.phase === 'playing') s.phase = 'paused'
    else if (s.phase === 'paused') s.phase = 'playing'
    sync()
  }
  const install = (kind: TowerKind) => {
    if (selected !== null) {
      buildTower(state.current, selected, kind)
      sync()
    }
  }
  const tower = hud.towers.find((t) => t.site === selected),
    config = tower ? TOWERS[tower.kind] : null
  const editable = hud.phase === 'playing' || hud.phase === 'build',
    ended = hud.phase === 'won' || hud.phase === 'lost'
  const wall = selected !== null && hud.walls.includes(selected)
  const placement = selected !== null && !wall ? previewWall(hud, selected) : null
  return (
    <section className="tide-defense" aria-label="바닷길 타워 디펜스 연습판">
      <header className="td-heading">
        <div>
          <span className="td-eyebrow">PONGDANG · DEFENSE LAB</span>
          <h2>
            바닷길 방어전 <span>연습판</span>
          </h2>
        </div>
        <div className="td-tools">
          <button
            className="td-icon-button"
            aria-label={hud.speed === 1 ? '2배속 켜기' : '1배속으로 변경'}
            disabled={!editable}
            onClick={() => {
              state.current.speed = hud.speed === 1 ? 2 : 1
              sync()
            }}
          >
            <FastForward size={15} />
            <small>{hud.speed}×</small>
          </button>
          <button
            className="td-icon-button"
            aria-label={hud.phase === 'paused' ? '계속하기' : '일시정지'}
            disabled={hud.phase !== 'playing' && hud.phase !== 'paused'}
            onClick={pause}
          >
            {hud.phase === 'paused' ? <Play size={17} /> : <Pause size={17} />}
          </button>
        </div>
      </header>
      <div className="td-hud">
        <span>
          <Waves size={15} />
          <b>
            {hud.wave}
            <small>/5</small>
          </b>
        </span>
        <span aria-label={`섬 내구도 ${hud.lives}`}>
          <Shield size={15} />
          <b>{hud.lives}</b>
        </span>
        <span className="td-money" aria-label={`보유 조개 ${hud.shells}`}>
          <Shell size={15} />
          <b>{hud.shells}</b>
        </span>
        <span className="td-score">
          {hud.score.toLocaleString()}
          <small>점</small>
        </span>
      </div>
      <div className="td-terrain-status">
        <span aria-label={`산호벽 ${WALL_LIMIT - hud.walls.length}개 남음`}>
          <BrickWall size={15} />
          <b>
            {WALL_LIMIT - hud.walls.length}
            <small>/{WALL_LIMIT}</small>
          </b>{' '}
          산호벽
        </span>
        <span aria-label={`현재 경로 ${hud.path.length}칸`}>
          바닷길 <b>{hud.path.length}칸</b>
        </span>
        <span>
          {hud.phase === 'build' ? (
            '자유 설계'
          ) : (
            <>
              <LockKeyhole size={12} />
              지형 고정
            </>
          )}
        </span>
      </div>
      <div className="td-board">
        <div className="td-map">
          <div
            ref={host}
            className="td-phaser"
            aria-label="산호벽을 피해 가장 짧은 길로 적이 이동하는 전장"
          />
          <div
            className="td-grid"
            role="group"
            aria-label="산호벽 설치 격자"
            onPointerLeave={() => setHovered(null)}
            onKeyDown={(event) => {
              const directions: Record<string, number> = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -GRID.columns,
                ArrowDown: GRID.columns,
              }
              const offset = directions[event.key],
                cell = Number((event.target as HTMLElement).dataset.cell)
              if (!offset || !Number.isInteger(cell)) return
              event.preventDefault()
              let next = cell + offset
              if (
                Math.abs(offset) === 1 &&
                Math.floor(next / GRID.columns) !== Math.floor(cell / GRID.columns)
              )
                return
              if (next === ENTRANCE || next === ISLAND) next += offset
              if (
                Math.abs(offset) === 1 &&
                Math.floor(next / GRID.columns) !== Math.floor(cell / GRID.columns)
              )
                return
              if (next < 0 || next >= SITES.length) return
              select(next)
              event.currentTarget.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus()
            }}
          >
            {SITES.map((_, i) => {
              const t = hud.towers.find((t) => t.site === i),
                Icon = t ? icons[t.kind] : hud.walls.includes(i) ? BrickWall : Plus,
                endpoint = i === ENTRANCE || i === ISLAND,
                hasWall = hud.walls.includes(i)
              return (
                <button
                  key={i}
                  className={`td-cell ${hasWall ? 'td-cell-wall' : ''} ${endpoint ? 'td-cell-endpoint' : ''} ${t ? 'td-site-built td-site-' + t.kind : ''} ${selected === i ? 'td-cell-selected' : ''} ${ghost?.cell === i && !ghost.valid && hud.phase === 'build' ? 'td-cell-invalid' : ''}`}
                  data-cell={i}
                  tabIndex={selected === i || (selected === null && i === 0) ? 0 : -1}
                  aria-label={
                    endpoint
                      ? i === ENTRANCE
                        ? '해적 입구'
                        : '우리 섬'
                      : `${Math.floor(i / GRID.columns) + 1}행 ${(i % GRID.columns) + 1}열 ${t ? TOWERS[t.kind].name + ' 레벨 ' + t.level : hasWall ? '산호벽' : '빈 칸'}`
                  }
                  aria-pressed={selected === i}
                  disabled={!editable || endpoint}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') setHovered(i)
                  }}
                  onClick={() => select(i)}
                >
                  {!endpoint && <Icon size={t ? 21 : 17} />}
                  {t && <small>{t.level}</small>}
                </button>
              )
            })}
          </div>
          {hud.phase !== 'ready' && !ended && (
            <div className="td-wave-label">
              {hud.phase === 'build'
                ? hud.wave
                  ? `WAVE ${hud.wave} CLEAR · 재정비 시간`
                  : 'PREPARE · 산호벽으로 바닷길을 설계해요'
                : `${hud.wave} WAVE · ${WAVE_NAMES[hud.wave - 1]} · ${hud.spawned}/${waveSize(hud.wave)}`}
            </div>
          )}
        </div>
        {(hud.phase === 'ready' || hud.phase === 'paused' || ended) && (
          <div className="td-overlay">
            <div className="td-intro">
              <span className="td-pill">
                {ended
                  ? hud.phase === 'won'
                    ? 'ISLAND SAVED'
                    : 'TRY AGAIN'
                  : hud.phase === 'paused'
                    ? 'TAKE A BREAK'
                    : 'BUILD · UPGRADE · DEFEND'}
              </span>
              <div className="td-emblem">
                <Anchor size={38} />
              </div>
              <h3>
                {ended ? (
                  hud.phase === 'won' ? (
                    '바닷길을 지켜냈어요!'
                  ) : (
                    '방어선이 뚫렸어요'
                  )
                ) : hud.phase === 'paused' ? (
                  '잠깐 쉬어가요'
                ) : (
                  <>
                    산호벽으로 길을 만들고
                    <br />
                    우리 섬을 지켜요.
                  </>
                )}
              </h3>
              <p>
                {ended ? (
                  `${hud.wave}웨이브 · ${hud.kills}마리 처치 · ${hud.score.toLocaleString()}점`
                ) : hud.phase === 'paused' ? (
                  '타워와 적 모두 기다리고 있어요.'
                ) : (
                  <>
                    복어의 가시, 통발의 감속, 해파리의 번개.
                    <br />
                    내가 만든 바닷길로 적을 유인해보세요.
                  </>
                )}
              </p>
              {hud.phase === 'ready' && (
                <div className="td-instructions">
                  <span>
                    01 <b>빈 칸 선택 → 경로 확인 → 산호벽 놓기</b>
                  </span>
                  <span>
                    02 <b>산호벽 위에 타워 설치 · 벽 10개 지급</b>
                  </span>
                  <span>
                    03 <b>웨이브 중 지형 고정 · 준비 중 무료 회수</b>
                  </span>
                </div>
              )}
              {error ? (
                <p role="alert">게임을 불러오지 못했어요. 페이지를 새로고침해 주세요.</p>
              ) : (
                <button
                  className="td-primary"
                  disabled={!ready}
                  onClick={hud.phase === 'paused' ? pause : start}
                >
                  {ended ? <RotateCcw size={17} /> : <Play size={17} />}{' '}
                  {hud.phase === 'paused'
                    ? '계속하기'
                    : ended
                      ? '다시 연습하기'
                      : ready
                        ? '연습 시작'
                        : '전장 준비 중…'}
                </button>
              )}
              {hud.phase === 'paused' && (
                <button className="td-secondary" onClick={start}>
                  처음부터 다시
                </button>
              )}
              {hud.phase === 'ready' && <small>무료 연습 · 골드 보상 없음</small>}
            </div>
          </div>
        )}
      </div>
      <div className="td-workshop" aria-label="타워 설치와 강화">
        <div className="td-workshop-title">
          <b>
            {selected === null
              ? hud.phase === 'playing'
                ? '벽 위 타워를 골라 강화하세요'
                : '격자의 빈 칸을 골라 길을 설계하세요'
              : `${Math.floor(selected / GRID.columns) + 1}행 ${(selected % GRID.columns) + 1}열 · ${tower ? config!.name + ' Lv.' + tower.level : wall ? '산호벽' : '예상 경로 확인'}`}
          </b>
          <span>
            {tower
              ? `사거리 ${towerRange(tower)} · ${tower.kills}마리 처치`
              : wall
                ? '산호벽 위에 타워를 세울 수 있어요'
                : hud.phase === 'playing'
                  ? '지형 고정 · 타워 선택 가능'
                  : '벽 설치 전 미리보기'}
          </span>
        </div>
        {!wall ? (
          <div
            className={`td-wall-planner ${placement && !placement.valid && hud.phase === 'build' ? 'td-wall-planner-invalid' : ''}`}
          >
            <div aria-live="polite">
              <b>
                {hud.phase === 'playing' || hud.phase === 'paused'
                  ? wallMessages.locked
                  : selected === null
                    ? '산호벽 10개로 나만의 길을 만들어요'
                    : placement?.valid
                      ? `설치하면 바닷길 ${placement.plan!.cells.length}칸`
                      : wallMessages[placement?.reason ?? 'locked']}
              </b>
              <p>
                {hud.phase === 'playing' || hud.phase === 'paused'
                  ? '벽 위의 타워를 선택하면 강화할 수 있어요.'
                  : selected === null
                    ? '칸을 누르면 적이 돌아갈 길을 먼저 보여줘요.'
                    : placement?.valid
                      ? '금빛 선은 설치 후 적이 지날 최단 경로예요.'
                      : '입구에서 섬까지 이어지는 길은 남겨두세요.'}
              </p>
            </div>
            <button
              className="td-place-wall"
              disabled={!placement?.valid}
              onClick={() => {
                if (selected !== null) {
                  placeWall(state.current, selected)
                  setHovered(null)
                  sync()
                }
              }}
            >
              <BrickWall size={17} />
              산호벽 놓기
            </button>
          </div>
        ) : tower ? (
          <div className="td-tower-actions">
            <button
              className="td-upgrade"
              disabled={!editable || tower.level >= 3 || hud.shells < upgradeCost(tower)}
              onClick={() => {
                upgradeTower(state.current, selected!)
                sync()
              }}
            >
              <ArrowUp size={16} />
              {tower.level >= 3 ? '최대 레벨' : `강화 ${upgradeCost(tower)}조개`}
              <small>공격 · 사거리 ↑</small>
            </button>
            <button
              className="td-sell"
              disabled={!editable}
              onClick={() => {
                sellTower(state.current, selected!)
                sync()
              }}
            >
              <Coins size={15} />
              판매 +{Math.floor(tower.spent * 0.7)}
            </button>
          </div>
        ) : (
          <div className="td-shop">
            {(Object.keys(TOWERS) as TowerKind[]).map((kind) => {
              const t = TOWERS[kind],
                Icon = icons[kind]
              return (
                <button
                  key={kind}
                  className={`td-shop-card td-shop-${kind}`}
                  disabled={!editable || selected === null || hud.shells < t.cost}
                  onClick={() => install(kind)}
                  aria-label={`${t.name} 설치 ${t.cost}조개`}
                >
                  <Icon size={21} />
                  <b>{t.name}</b>
                  <small>
                    {kind === 'puffer' ? '단일 공격' : kind === 'net' ? '광역 감속' : '연쇄 공격'}
                  </small>
                  <span>
                    <Shell size={11} />
                    {t.cost}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {wall && (
          <div className="td-reclaim">
            <span>
              {hud.phase !== 'build'
                ? '웨이브가 끝나면 다시 길을 바꿀 수 있어요.'
                : tower
                  ? '타워를 판매하면 산호벽을 회수할 수 있어요.'
                  : '회수하면 산호벽 1개가 그대로 돌아와요.'}
            </span>
            <button
              disabled={hud.phase !== 'build' || !!tower}
              onClick={() => {
                removeWall(state.current, selected!)
                sync()
              }}
            >
              <Undo2 size={13} />
              산호벽 회수
            </button>
          </div>
        )}
      </div>
      <div className="td-bottom">
        <span>
          {hud.phase === 'build'
            ? hud.wave
              ? '조개를 받았어요. 다음 파도에 대비하세요.'
              : '벽은 무료예요. 타워 하나를 세우면 시작할 수 있어요.'
            : '지형 고정 · 산호벽 위 타워 설치·강화는 가능해요.'}
        </span>
        <button
          className="td-wave-start"
          disabled={hud.phase !== 'build' || !hud.towers.length}
          onClick={() => {
            startWave(state.current)
            select(null)
            sync()
          }}
        >
          <Play size={15} />
          {hud.phase === 'playing'
            ? '방어 중'
            : hud.wave >= 5
              ? '방어 종료'
              : `${hud.wave + 1}웨이브 시작`}
        </button>
      </div>
    </section>
  )
}
