import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Castle,
  Coins,
  Pause,
  Play,
  RotateCcw,
  Waves,
  X,
  Plus,
  Trophy,
  CalendarDays,
} from 'lucide-react'
import { GameModal } from './game-modal'
import { GameTabs, GameStartOverlay, type GameTab } from './game-controls'
import { TowerArt } from './tower-defense-art'
import { TowerAttackBadge } from './tower-defense-attack-badge'
import { placementCell } from './tower-defense-placement'
import { TowerInspector } from './tower-defense-inspector'
import { DEFENSE_ART, DEFENSE_POSTER } from './tower-defense-assets'
import { TOWER_DESCRIPTIONS } from './tower-defense-towers'
import { GoldIcon } from '@/features/gold/gold-provider'
import { TowerDefenseRanking } from './tower-defense-ranking'
import { useTowerDefenseRun } from './use-tower-defense-run'
import { clearedTowerStages } from './tower-defense-replay'
import {
  BUILDINGS,
  TOWER_KINDS,
  MONSTERS,
  MONSTER_KINDS,
  WAVES,
  HOME,
  MAX_WAVES,
  beginDefense,
  canPlace,
  canMove,
  castleUpgradeCost,
  createDefense,
  specializationUnlocked,
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
    movingRef = useRef<number | null>(null),
    drag = useRef<{ id: number; x: number; y: number; kind: BuildKind; moved: boolean } | null>(
      null,
    ),
    dragCell = useRef<number | null | undefined>(undefined),
    ignoreClickUntil = useRef(0),
    catalogVisible = useRef(false)
  const catalogPanel = useRef<HTMLDivElement>(null)
  const catalogTrigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false),
    [tab, setTab] = useState<GameTab>('game'),
    [ready, setReady] = useState(false),
    [loadFailed, setLoadFailed] = useState(false),
    [error, setError] = useState(''),
    [tool, setTool] = useState<BuildKind | null>(null),
    [notice, setNotice] = useState(''),
    [catalogOpen, setCatalogOpen] = useState(false),
    [catalogFilter, setCatalogFilter] = useState<'all' | 'ground' | 'air'>('all'),
    [catalogDragging, setCatalogDragging] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [moving, setMoving] = useState<number | null>(null),
    [, render] = useState(0)
  const sync = useCallback(() => render((n) => n + 1), [])
  const real = useTowerDefenseRun(state, open, sync)
  const command = real.execute,
    pause = real.pause
  useEffect(() => {
    setOpen(false)
  }, [real.session?.user.id, real.ownerScope])
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
    movingRef.current = null
    setMoving(null)
    toolRef.current = null
    dragCell.current = undefined
    setTool(null)
    showCatalog(false)
    setCatalogDragging(false)
    choose(null)
  }, [choose, showCatalog])
  const arm = useCallback(
    (kind: BuildKind) => {
      movingRef.current = null
      setMoving(null)
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
      if (movingRef.current !== null) {
        if (painting) return
        const from = movingRef.current
        if (from === cell) {
          movingRef.current = null
          setMoving(null)
          choose(cell)
          return
        }
        const message = canMove(current, from, cell)
        if (message) {
          setError(message)
          return
        }
        const name = BUILDINGS[current.buildings.find((b) => b.cell === from)!.kind].name
        if (!command({ type: 'move', from, to: cell })) return
        movingRef.current = null
        setMoving(null)
        choose(cell)
        sync()
        setNotice(`${name} 이동`)
        return
      }
      if (painting && !toolRef.current) return
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
      if (!command({ type: 'build', cell, kind })) return
      dragCell.current = undefined
      showCatalog(false)
      setCatalogDragging(false)
      choose(null)
      setNotice(`${BUILDINGS[kind].name} 설치 · -${BUILDINGS[kind].cost}`)
      sync()
    },
    [choose, cancel, showCatalog, sync, command],
  )
  const paintBuild = useCallback((cell: number) => place(cell, true), [place])
  const beginMove = useCallback(
    (cell: number) => {
      cancel()
      movingRef.current = cell
      setMoving(cell)
      choose(cell)
      setNotice('')
    },
    [cancel, choose],
  )
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
      if (
        event.key === 'Escape' &&
        (toolRef.current || movingRef.current !== null || catalogVisible.current)
      ) {
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
          paintBuild,
          () => movingRef.current,
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
  }, [open, place, paintBuild, pause, sync])
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
    real.practice()
    state.current = createDefense(Math.floor(Math.random() * 4294967296))
    beginDefense(state.current)
    cancel()
    setNotice('')
    setError('')
    sync()
  }
  async function startPaid() {
    if (!(await real.start())) return
    cancel()
    setError('')
    setNotice('')
    setReady(false)
    setLoadFailed(false)
    setOpen(true)
  }
  async function leave() {
    pause(true)
    if (real.paid && !(await real.save(true))) throw Error('SETTLEMENT_PENDING')
    setOpen(false)
  }
  function run(action: () => boolean, message = '건설 코인이 부족하거나 지금은 사용할 수 없어요.') {
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
          // Let touch gestures scroll the catalog; tapping still selects a tower.
          if (event.pointerType === 'touch' && kind !== 'wall') return
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
    <section className="td-page">
      <GameTabs id="tower-defense" value={tab} onChange={setTab} />
      <div
        id="tower-defense-game-panel"
        role="tabpanel"
        aria-labelledby="tower-defense-game-tab"
        hidden={tab !== 'game'}
        className={tab === 'game' ? 'td-menu-panel' : 'hidden'}
      >
        {tab === 'game' && !open && (
          <GameStartOverlay
            title="퐁이의 타워디펜스"
            description="나만의 방어선을 만들고 바다 성을 지켜요."
            poster={DEFENSE_POSTER}
            fee={30}
            paidLabel={
              real.busy
                ? '입장 확인 중…'
                : real.uncertainEntry
                  ? '참가 결과 다시 확인'
                  : real.query.data?.run && !real.query.data.run.finished_at
                    ? '실전 이어하기'
                    : !real.query.data?.enabled
                      ? '실전 · 준비 중'
                      : undefined
            }
            paidDisabled={real.busy || !real.session || !real.query.data?.enabled}
            onPaid={() => void startPaid()}
            practiceLabel="연습 시작"
            practiceDisabled={real.busy}
            onPractice={() => {
              reset()
              setReady(false)
              setLoadFailed(false)
              setOpen(true)
            }}
            rules={[
              '50웨이브 · 10웨이브마다 보스',
              '벽으로 길 유도 · 공중 적은 성으로 직진',
              '드래그로 연속 설치 · 선택해서 강화·이동',
            ]}
          >
            <p className="inline-flex items-center justify-center gap-1.5 text-xs text-white/80">
              <CalendarDays size={14} />
              스테이지당 10골드 즉시 지급 · 주간 정산
            </p>
            <p className="text-xs text-white/60">연습은 무료 · 골드 보상과 랭킹 기록 없음</p>
            <p className="text-xs text-white/60">실전 중도 종료는 랭킹 제외 · 지급된 골드는 유지</p>
            {real.error && (
              <p role="alert" className="text-xs text-red-200">
                {real.error}
              </p>
            )}
          </GameStartOverlay>
        )}
      </div>
      <div
        id="tower-defense-rank-panel"
        role="tabpanel"
        aria-labelledby="tower-defense-rank-tab"
        hidden={tab !== 'rank'}
        className={tab === 'rank' ? 'td-rank-panel' : 'hidden'}
      >
        {tab === 'rank' &&
          (real.session && real.query.data?.enabled ? (
            <TowerDefenseRanking />
          ) : (
            <div className="td-ranking-empty">
              <Trophy size={32} />
              <h2>주간 랭킹 준비 중</h2>
              <p>실전 모드가 열리면 주간 기록과 정산을 확인할 수 있어요.</p>
              <button onClick={() => setTab('game')}>연습하러 가기</button>
            </div>
          ))}
      </div>
      <div hidden={!open} className={open ? 'contents' : 'hidden'}>
        <GameModal
          open={open}
          title="퐁이의 타워디펜스"
          active={!finished}
          practice={!real.paid}
          busy={real.busy || real.unresolved}
          exitDescription={
            real.paid
              ? '지급된 골드는 유지돼요. 중도 종료한 실전은 주간 랭킹에서 제외돼요.'
              : undefined
          }
          layout="contained"
          modeLabel={real.paid ? '실전' : '연습'}
          headerClassName="td-modal-header"
          headerActions={
            <>
              <span className="td-game-balance" aria-label={`건설 코인 ${s.gold}`}>
                <Coins size={20} aria-hidden="true" />
                <span>
                  <small>건설 코인</small>
                  <strong>{s.gold.toLocaleString()}</strong>
                </span>
              </span>
              <button
                className="td-header-pause"
                aria-label={s.phase === 'paused' ? '계속하기' : '일시정지'}
                onClick={() => pause(s.phase !== 'paused')}
                disabled={!ready || (!active && s.phase !== 'paused')}
              >
                {s.phase === 'paused' ? <Play size={16} /> : <Pause size={16} />}
              </button>
            </>
          }
          onExit={leave}
          onPause={pause}
        >
          {open && (
            <div
              className="td-game"
              role="application"
              aria-label={`세로형 타워디펜스 ${real.paid ? '실전' : '연습'}`}
            >
              <div className="td-hud">
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
              </div>
              <div className="td-wave">
                <div className="td-wave-summary">
                  <strong>
                    {s.phase === 'build'
                      ? `${previewWave}웨이브 · ${Math.ceil(s.prep)}초 후 시작`
                      : s.phase === 'paused'
                        ? '잠깐 쉬어가요'
                        : finished
                          ? real.paid
                            ? '실전 종료'
                            : '연습 종료'
                          : `${s.wave}웨이브 · 남은 적 ${s.enemies.length + s.pending.length + waveSize(s.wave) - s.spawned}`}
                  </strong>
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
                  onClick={() => run(() => command({ type: 'wave' }))}
                >
                  지금 보내기
                </button>
              </div>
              <div className="td-stage-wrap">
                <button
                  className="sr-only"
                  aria-label={`성 체력 ${s.lives}/${s.maxLives} · 성 강화 선택`}
                  disabled={!active}
                  aria-pressed={selected === HOME}
                  onClick={() => {
                    cancel()
                    choose(HOME)
                  }}
                >
                  성 강화
                </button>
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
                {s.phase === 'paused' && !real.unresolved && (
                  <div className="td-overlay">
                    <h3>잠깐 쉬어가요</h3>
                    <button
                      className="td-primary"
                      disabled={real.busy}
                      onClick={() => pause(false)}
                    >
                      계속하기
                    </button>
                  </div>
                )}
                {finished && (
                  <div className="td-overlay">
                    <span className="td-eyebrow">
                      {s.phase === 'won' ? '50웨이브 클리어' : '다시 도전해 볼까요?'}
                    </span>
                    <h3>
                      {s.phase === 'won'
                        ? '바다 성을 지켰어요!'
                        : s.finalEscaped
                          ? '마지막 보스가 성에 도착했어요'
                          : '성의 불빛이 꺼졌어요'}
                    </h3>
                    <p>
                      {s.kills}마리 처치 · 성 체력 {s.lives}/{s.maxLives}
                    </p>
                    {real.paid && (
                      <p>
                        {clearedTowerStages(s)}스테이지 통과 ·{' '}
                        <GoldIcon className="inline size-4" /> {real.reward}골드 지급
                      </p>
                    )}
                    <button
                      className="td-primary"
                      disabled={real.busy || real.unresolved}
                      onClick={() => {
                        if (!real.paid) reset()
                        else
                          void (async () => {
                            if (await real.save(true)) await startPaid()
                          })()
                      }}
                    >
                      <RotateCcw size={15} /> {real.paid ? '다시 도전 · 30골드' : '다시 연습'}
                    </button>
                  </div>
                )}
              </div>
              {s.phase !== 'paused' && (
                <div
                  className={`td-inspector${selected === null && !tool ? ' is-idle' : ''}`}
                  aria-live="polite"
                >
                  <div
                    className={`td-selection${b ? ' has-structure' : ''}${tool ? ' has-tool' : ''}`}
                  >
                    {moving !== null ? (
                      <div className="td-placement-panel">
                        <strong>포탑 이동</strong>
                        <div className="td-placement-controls">
                          <span>이동할 칸을 누르거나 드래그하세요. 강화와 특화는 유지돼요.</span>
                          <button onClick={cancel}>
                            <X size={13} />
                            이동 취소
                          </button>
                        </div>
                      </div>
                    ) : tool ? (
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
                              : '빈 칸을 누르거나 드래그해 연속 설치해요.'}
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
                          onClick={() => run(() => command({ type: 'castle' }))}
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
                        onUpgrade={() => run(() => command({ type: 'upgrade', cell: b.cell }))}
                        onMove={() => beginMove(b.cell)}
                        canSpecialize={specializationUnlocked(s)}
                        onSpecialize={(kind) =>
                          run(() => command({ type: 'specialize', cell: b.cell, kind }))
                        }
                        onSell={() => {
                          if (command({ type: 'sell', cell: b.cell })) {
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
                    {!tool && moving === null && selected !== null && (
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
                      <span className="td-balance" aria-label={`건설 코인 ${s.gold}`}>
                        <Coins size={14} />
                        {s.gold.toLocaleString()}
                      </span>
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
              {real.paid && (
                <div className="td-payment-status" aria-live="polite">
                  {real.busy
                    ? '진행 기록과 보상을 확인하고 있어요…'
                    : real.error ||
                      real.receipt ||
                      `통과 스테이지마다 10골드 · 누적 ${real.reward}골드`}
                  {real.unresolved && !real.busy && (
                    <button onClick={() => void real.save()}>저장 결과 다시 확인</button>
                  )}
                </div>
              )}
            </div>
          )}
        </GameModal>
      </div>
    </section>
  )
}
