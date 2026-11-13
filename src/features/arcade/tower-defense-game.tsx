import { useCallback, useEffect, useRef, useState } from 'react'
import { Castle, Coins, Heart, Pause, Play, RotateCcw, Waves, X, Plus } from 'lucide-react'
import { GameModal } from './game-modal'
import { TowerArt } from './tower-defense-art'
import { TowerAttackBadge } from './tower-defense-attack-badge'
import { placementCell } from './tower-defense-placement'
import { TowerInspector } from './tower-defense-inspector'
import { DEFENSE_ART } from './tower-defense-assets'
import { TOWER_DESCRIPTIONS } from './tower-defense-towers'
import {
  BUILDINGS,
  TOWER_KINDS,
  MONSTERS,
  MONSTER_KINDS,
  WAVES,
  HOME,
  MAX_WAVES,
  beginDefense,
  build,
  canPlace,
  castleUpgradeCost,
  createDefense,
  configureStartingWave,
  pauseDefense,
  sell,
  startWave,
  upgrade,
  upgradeCastle,
  waveHint,
  waveSize,
  type BuildKind,
} from './tower-defense-engine'
import './tower-defense.css'

export default function TowerDefenseGame() {
  const state = useRef(createDefense()),
    host = useRef<HTMLDivElement>(null),
    selection = useRef<number | null>(null),
    toolRef = useRef<BuildKind | null>(null),
    drag = useRef<{ id: number; x: number; y: number; kind: BuildKind; moved: boolean } | null>(
      null,
    ),
    dragCell = useRef<number | null | undefined>(undefined),
    ignoreClickUntil = useRef(0),
    catalogVisible = useRef(false)
  const catalogPanel = useRef<HTMLDivElement>(null)
  const catalogTrigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false),
    [ready, setReady] = useState(false),
    [loadFailed, setLoadFailed] = useState(false),
    [error, setError] = useState(''),
    [tool, setTool] = useState<BuildKind | null>(null),
    [notice, setNotice] = useState(''),
    [catalogOpen, setCatalogOpen] = useState(false),
    [catalogFilter, setCatalogFilter] = useState<'all' | 'ground' | 'air'>('all'),
    [catalogDragging, setCatalogDragging] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [, render] = useState(0)
  const sync = useCallback(() => render((n) => n + 1), [])
  const catalogPaused = state.current.phase === 'paused'
  useEffect(() => {
    if (!open || !catalogOpen || catalogDragging || catalogPaused) return
    const panel = catalogPanel.current
    if (!panel) return
    panel.querySelector<HTMLButtonElement>('button')?.focus()
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      const first = buttons[0],
        last = buttons.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    panel.addEventListener('keydown', trapFocus)
    return () => {
      panel.removeEventListener('keydown', trapFocus)
      catalogTrigger.current?.focus()
    }
  }, [open, catalogOpen, catalogDragging, catalogPaused])
  const choose = useCallback((cell: number | null) => {
    selection.current = cell
    setSelected(cell)
    setError('')
  }, [])
  const showCatalog = useCallback((value: boolean) => {
    catalogVisible.current = value
    setCatalogOpen(value)
  }, [])
  const cancel = useCallback(() => {
    toolRef.current = null
    dragCell.current = undefined
    setTool(null)
    showCatalog(false)
    setCatalogDragging(false)
    choose(null)
  }, [choose, showCatalog])
  const arm = useCallback(
    (kind: BuildKind) => {
      toolRef.current = kind
      setTool(kind)
      setNotice('')
      choose(null)
    },
    [choose],
  )
  const place = useCallback(
    (cell: number, painting = false) => {
      const current = state.current
      if (painting && toolRef.current !== 'wall') return
      if (cell === HOME || current.buildings.some((b) => b.cell === cell)) {
        if (painting) return
        cancel()
        choose(cell)
        return
      }
      const kind = toolRef.current
      if (!kind) {
        choose(null)
        return
      }
      const message = canPlace(current, cell, kind)
      if (message) {
        setError(message)
        return
      }
      build(current, cell, kind)
      dragCell.current = undefined
      showCatalog(false)
      setCatalogDragging(false)
      choose(null)
      setNotice(`${BUILDINGS[kind].name} 설치 · -${BUILDINGS[kind].cost}`)
      sync()
    },
    [choose, cancel, showCatalog, sync],
  )
  const paintWall = useCallback((cell: number) => place(cell, true), [place])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 1100)
    return () => window.clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    if (!open) return
    const cellAtPointer = (event: PointerEvent) => {
      const canvas = host.current?.querySelector('canvas')
      return canvas
        ? placementCell(event.clientX, event.clientY, canvas.getBoundingClientRect())
        : null
    }
    const move = (event: PointerEvent) => {
      const gesture = drag.current
      if (!gesture || gesture.id !== event.pointerId) return
      if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) {
        gesture.moved = true
        arm(gesture.kind)
        setCatalogDragging(true)
      }
      if (gesture.moved) dragCell.current = cellAtPointer(event)
    }
    const end = (event: PointerEvent) => {
      const gesture = drag.current
      if (!gesture || gesture.id !== event.pointerId) return
      drag.current = null
      if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) {
        gesture.moved = true
        arm(gesture.kind)
      }
      if (gesture.moved) {
        ignoreClickUntil.current = performance.now() + 300
        const cell = cellAtPointer(event)
        if (event.type === 'pointercancel' || cell === null) cancel()
        else place(cell)
        showCatalog(false)
      }
      setCatalogDragging(false)
      dragCell.current = undefined
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (toolRef.current || catalogVisible.current)) {
        event.preventDefault()
        event.stopPropagation()
        drag.current = null
        cancel()
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('keydown', escape, true)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('keydown', escape, true)
      drag.current = null
      dragCell.current = undefined
    }
  }, [open, arm, cancel, place, showCatalog])
  const pause = useCallback(
    (value: boolean) => {
      pauseDefense(state.current, value)
      sync()
    },
    [sync],
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
          place,
          () => {
            if (!cancelled) {
              setReady(true)
              sync()
            }
          },
          () => toolRef.current,
          (message) => {
            if (!cancelled) {
              setError(message)
              setLoadFailed(true)
            }
          },
          () => dragCell.current,
          paintWall,
        )
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true)
          setError('전장을 불러오지 못했어요. 나갔다가 다시 시작해 주세요.')
        }
      })
    const blur = () => pause(true),
      visibility = () => {
        if (document.hidden) pause(true)
      }
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancelled = true
      game?.destroy(true)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [open, place, paintWall, pause, sync])
  const s = state.current,
    b = s.buildings.find((b) => b.cell === selected),
    active = s.phase === 'build' || s.phase === 'combat',
    finished = s.phase === 'won' || s.phase === 'lost'
  const previewWave = s.wave === 0 ? s.startingWave : s.phase === 'build' ? s.wave + 1 : s.wave
  const catalogTowers = TOWER_KINDS.filter(
    (kind) =>
      catalogFilter === 'all' ||
      BUILDINGS[kind].targetLayer === 'both' ||
      BUILDINGS[kind].targetLayer === catalogFilter,
  ).sort((a, b) => BUILDINGS[a].cost - BUILDINGS[b].cost)
  const enemyPreview = MONSTER_KINDS.filter((kind) => WAVES[previewWave - 1]?.counts[kind]).sort(
    (a, b) => {
      const left = MONSTERS[a],
        right = MONSTERS[b]
      if (left.boss !== right.boss) return left.boss ? -1 : 1
      return Number(right.layer === 'air') - Number(left.layer === 'air')
    },
  )
  function reset() {
    const startingWave = state.current.startingWave
    state.current = createDefense(Math.floor(Math.random() * 4294967296))
    beginDefense(state.current)
    configureStartingWave(state.current, startingWave)
    cancel()
    setNotice('')
    setError('')
    sync()
  }
  function run(action: () => boolean, message = '연습 코인이 부족하거나 지금은 사용할 수 없어요.') {
    if (!action()) setError(message)
    else setError('')
    sync()
  }
  function buildButton(kind: BuildKind) {
    return (
      <button
        key={kind}
        data-td-build-kind={kind}
        aria-pressed={tool === kind}
        aria-label={`${BUILDINGS[kind].name} ${BUILDINGS[kind].cost}코인`}
        disabled={!active || !ready || s.gold < BUILDINGS[kind].cost}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            kind,
            moved: false,
          }
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }}
        onClick={() => {
          if (performance.now() < ignoreClickUntil.current) return
          if (toolRef.current === kind) cancel()
          else {
            arm(kind)
            showCatalog(false)
          }
        }}
      >
        <TowerArt kind={kind} />
        <span>
          <strong>{BUILDINGS[kind].name}</strong>
          <small>
            <Coins size={11} />
            {BUILDINGS[kind].cost}
          </small>
          {kind !== 'wall' && (
            <em>
              <TowerAttackBadge kind={kind} />
              <span>{BUILDINGS[kind].role}</span>
            </em>
          )}
        </span>
      </button>
    )
  }
  return (
    <div className="td-lobby">
      {!open && (
        <>
          <div className="td-intro-art">
            <TowerArt kind="octopus" />
            <Castle size={44} />
            <TowerArt kind="seahorse" />
          </div>
          <span className="td-eyebrow">무료 연습 · 세로 플레이</span>
          <h2>퐁이의 타워디펜스</h2>
          <p>
            두 갈래 물길에서 몰려오는 친구들!
            <br />
            문어포와 해마포로 작은 바다 성을 지켜요.
          </p>
          <button
            className="td-primary"
            onClick={() => {
              reset()
              setReady(false)
              setLoadFailed(false)
              setOpen(true)
            }}
          >
            연습 시작
          </button>
          <div className="td-guide">
            <p>
              <strong>30웨이브 · 성 체력 15</strong>
              <br />
              타워와 성은 세 번까지 강화해요. 10·20·30웨이브에는 보스가 등장해요.
            </p>
            <p>
              도구를 고르고 빈 칸을 누르거나, 도구를 맵으로 끌어놓으세요. 벽으로 길을 늘릴 수 있지만
              완전히 막을 수는 없어요. 공중 적은 성까지 직진해요. 공중 전용 미사일 타워로 막아
              주세요.
            </p>
            <p>
              웨이브 사이 20초 정비 · 바로 보내기 가능
              <br />
              전용 연습 코인을 사용하며 참가비와 실제 골드 보상은 없어요.
            </p>
          </div>
        </>
      )}
      <GameModal
        open={open}
        title="타워디펜스"
        active={!finished}
        practice
        layout="fullscreen"
        modeLabel="30웨이브 방어"
        onExit={() => {
          pause(true)
          setOpen(false)
        }}
        onPause={pause}
      >
        {open && (
          <div className="td-game" role="application" aria-label="세로형 타워디펜스 연습">
            <div className="td-hud">
              <button
                className="td-health"
                aria-label={`성 체력 ${s.lives}/${s.maxLives} · 성 강화 선택`}
                title="성 강화"
                disabled={!active}
                aria-pressed={selected === HOME}
                onClick={() => {
                  cancel()
                  choose(HOME)
                }}
              >
                <Heart size={16} />
                <strong>{s.lives}</strong>
                <small>/{s.maxLives}</small>
              </button>
              <span aria-label={`연습 코인 ${s.gold}`}>
                <Coins size={16} />
                <strong>{s.gold}</strong>
              </span>
              <span>
                <Waves size={15} />
                {s.wave}/{MAX_WAVES}
              </span>
              <button
                className="td-speed"
                aria-label={s.playbackRate === 2 ? '2배속 끄기' : '2배속 켜기'}
                aria-pressed={s.playbackRate === 2}
                title="전투와 정비 시간을 2배 빠르게 진행해요."
                disabled={finished}
                onClick={() => {
                  s.playbackRate = s.playbackRate === 2 ? 1 : 2
                  sync()
                }}
              >
                {s.playbackRate}×
              </button>
              <button
                aria-label={s.phase === 'paused' ? '계속하기' : '일시정지'}
                onClick={() => pause(s.phase !== 'paused')}
                disabled={!active && s.phase !== 'paused'}
              >
                {s.phase === 'paused' ? <Play size={17} /> : <Pause size={17} />}
              </button>
            </div>
            <div className="td-wave">
              <div className="td-wave-summary">
                {s.wave === 0 ? (
                  <label className="td-start-wave">
                    시작 웨이브
                    <select
                      aria-label="시작 웨이브"
                      value={s.startingWave}
                      disabled={s.phase !== 'build' || s.buildings.length > 0}
                      title="시설을 짓기 전에 선택하세요. 이전 웨이브의 예상 수입을 준비 코인으로 받아요."
                      onChange={(event) =>
                        run(() => configureStartingWave(s, Number(event.target.value)))
                      }
                    >
                      {Array.from({ length: MAX_WAVES }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}웨이브{(i + 1) % 10 === 0 ? ' · 보스' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <strong>
                    {s.phase === 'build'
                      ? `정비 ${Math.ceil(s.prep)}초`
                      : s.phase === 'paused'
                        ? '잠깐 쉬어가요'
                        : finished
                          ? '연습 종료'
                          : `${s.wave}웨이브 · 남은 적 ${s.enemies.length + s.pending.length + waveSize(s.wave) - s.spawned}`}
                  </strong>
                )}
                <span className="sr-only">{waveHint(previewWave)}</span>
                <ul
                  className="td-enemy-preview"
                  aria-label={`${previewWave}웨이브 등장 적`}
                  title={waveHint(previewWave)}
                >
                  {enemyPreview.map((kind) => {
                    const monster = MONSTERS[kind],
                      count = WAVES[previewWave - 1].counts[kind]
                    const airborne = monster.layer === 'air'
                    const label = `${monster.name} ${count}마리${airborne ? ' · 공중' : ''}`
                    return (
                      <li key={kind} title={label} aria-label={label}>
                        <span
                          role="img"
                          aria-label={monster.name}
                          className="td-enemy-portrait"
                          style={{
                            backgroundImage: `url(${DEFENSE_ART.enemies})`,
                            backgroundSize: `128px ${MONSTER_KINDS.length * 32}px`,
                            backgroundPosition: `0 -${Math.floor(monster.frame / 4) * 32}px`,
                          }}
                        />
                        {airborne && <span className="td-enemy-air">공중</span>}
                        <span className="td-enemy-count">×{count}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <button
                className="td-primary"
                disabled={!ready || s.phase !== 'build'}
                onClick={() => run(() => startWave(s))}
              >
                {s.wave === 0 ? `${s.startingWave}웨이브 시작` : '바로 보내기'}
              </button>
            </div>
            <div className="td-stage-wrap">
              <div
                ref={host}
                className="td-stage"
                aria-label="위쪽 두 입구와 아래쪽 성이 있는 세로 전장"
                onContextMenu={(event) => {
                  if (toolRef.current) {
                    event.preventDefault()
                    cancel()
                  }
                }}
              />
              {notice && (
                <div className="td-placement-toast" role="status">
                  {notice}
                </div>
              )}
              {!ready && (
                <div className="td-overlay" role="status">
                  <p>
                    {loadFailed
                      ? '전장을 불러오지 못했어요. 다시 시작해 주세요.'
                      : '바다 성을 준비하고 있어요…'}
                  </p>
                  {loadFailed && (
                    <button className="td-primary" onClick={() => setOpen(false)}>
                      시작 화면으로
                    </button>
                  )}
                </div>
              )}
              {s.phase === 'paused' && (
                <div className="td-overlay">
                  <h3>잠깐 쉬어가요</h3>
                  <button className="td-primary" onClick={() => pause(false)}>
                    계속하기
                  </button>
                </div>
              )}
              {finished && (
                <div className="td-overlay">
                  <span className="td-eyebrow">
                    {s.phase === 'won' ? '30웨이브 클리어' : '다시 도전해 볼까요?'}
                  </span>
                  <h3>
                    {s.phase === 'won'
                      ? '바다 성을 지켰어요!'
                      : s.finalEscaped
                        ? '심연의 소라왕이 성에 도착했어요'
                        : '성의 불빛이 꺼졌어요'}
                  </h3>
                  <p>
                    {s.kills}마리 처치 · 성 체력 {s.lives}/{s.maxLives}
                  </p>
                  <button className="td-primary" onClick={reset}>
                    <RotateCcw size={15} /> 다시 연습
                  </button>
                </div>
              )}
            </div>
            {s.phase !== 'paused' && (
              <div className="td-inspector" aria-live="polite">
                <div
                  className={`td-selection${b ? ' has-structure' : ''}${tool ? ' has-tool' : ''}`}
                >
                  {tool ? (
                    <div className="td-placement-panel">
                      <strong title={TOWER_DESCRIPTIONS[tool]}>
                        <TowerArt kind={tool} />
                        {BUILDINGS[tool].name}
                        <TowerAttackBadge kind={tool} />
                        <small>{BUILDINGS[tool].cost} 코인</small>
                      </strong>
                      <div className="td-placement-controls">
                        <span>
                          {tool === 'wall'
                            ? '맵을 드래그해 벽을 이어 놓아요.'
                            : '빈 칸을 눌러 계속 설치해요.'}
                        </span>
                        <button onClick={cancel}>
                          <X size={13} /> 배치 취소
                        </button>
                      </div>
                    </div>
                  ) : selected === HOME ? (
                    <>
                      <strong>
                        <Castle size={15} /> 바다 성{' '}
                        {s.castleLevel > 0 && <b className="td-level">{s.castleLevel}</b>}
                      </strong>
                      <span>
                        체력 {s.lives}/{s.maxLives}
                        {s.castleLevel < 3 ? ' → 최대 체력 +5 · 현재 체력 +5' : ' · 최대 강화'}
                      </span>
                      <button
                        disabled={!active || s.gold < castleUpgradeCost(s)}
                        onClick={() => run(() => upgradeCastle(s))}
                      >
                        {s.castleLevel === 3 ? '최대 강화 3' : `성 강화 ${castleUpgradeCost(s)}`}
                      </button>
                    </>
                  ) : b ? (
                    <TowerInspector
                      key={b.cell}
                      building={b}
                      active={active}
                      gold={s.gold}
                      onUpgrade={() => run(() => upgrade(s, b.cell))}
                      onSell={() => {
                        if (sell(s, b.cell)) {
                          choose(null)
                          sync()
                        }
                      }}
                    />
                  ) : (
                    <>
                      <span className="td-empty-hint">
                        도구를 골라 배치하거나, 시설을 눌러 강화하세요.
                      </span>
                    </>
                  )}
                  {!tool && selected !== null && (
                    <button
                      className="td-dismiss"
                      aria-label="선택 취소"
                      onClick={() => {
                        selection.current = null
                        setSelected(null)
                        setError('')
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {error && (
                  <p className="td-message" role="alert">
                    {error}
                  </p>
                )}
              </div>
            )}
            {catalogOpen && s.phase !== 'paused' && (
              <>
                <button
                  className={`td-catalog-shade ${catalogDragging ? 'is-dragging' : ''}`}
                  aria-label="건설 목록 닫기"
                  onClick={cancel}
                />
                <div
                  ref={catalogPanel}
                  className={`td-catalog ${catalogDragging ? 'is-dragging' : ''}`}
                  role={catalogDragging ? 'group' : 'dialog'}
                  aria-modal={!catalogDragging}
                  aria-label="포탑 구매"
                >
                  <div className="td-catalog-header">
                    <strong>포탑 건설</strong>
                    <button aria-label="포탑 목록 닫기" onClick={cancel}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="td-catalog-options">
                    <div className="td-catalog-filters" role="group" aria-label="공격 대상 필터">
                      {(['all', 'ground', 'air'] as const).map((filter) => (
                        <button
                          key={filter}
                          aria-pressed={catalogFilter === filter}
                          onClick={() => setCatalogFilter(filter)}
                        >
                          {filter === 'all' ? '전체' : filter === 'ground' ? '지상' : '공중'}
                        </button>
                      ))}
                    </div>
                    <small>낮은 가격순</small>
                  </div>
                  <div className="td-catalog-grid" role="group" aria-label="포탑 선택">
                    {catalogTowers.map((kind) => buildButton(kind))}
                  </div>
                </div>
              </>
            )}
            {s.phase !== 'paused' && (
              <div className="td-tools" role="group" aria-label="건설 도구">
                <button
                  ref={catalogTrigger}
                  aria-label="포탑 건설"
                  aria-expanded={catalogOpen}
                  aria-pressed={!!tool && tool !== 'wall'}
                  disabled={!active || !ready}
                  onClick={() => {
                    const next = !catalogVisible.current
                    cancel()
                    showCatalog(next)
                  }}
                >
                  <Plus size={26} />
                  <span>
                    포탑 건설<small>{TOWER_KINDS.length}종</small>
                  </span>
                </button>
                {buildButton('wall')}
              </div>
            )}
          </div>
        )}
      </GameModal>
    </div>
  )
}
