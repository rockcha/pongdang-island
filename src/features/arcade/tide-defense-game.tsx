import { useEffect, useRef, useState } from 'react'
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
  type TowerKind,
} from './tide-defense-engine'
import './tide-defense.css'

const icons = { puffer: Fish, net: Anchor, jelly: Zap }
export default function TideDefenseGame() {
  const state = useRef(createDefense()),
    host = useRef<HTMLDivElement>(null),
    selection = useRef<number | null>(null)
  const [hud, setHud] = useState(createDefense),
    [selected, setSelected] = useState<number | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false)
  const sync = () =>
    setHud({ ...state.current, towers: state.current.towers.map((t) => ({ ...t })) })
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
    select(0)
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
      <div className="td-board">
        <div className="td-map">
          <div
            ref={host}
            className="td-phaser"
            aria-label="적이 고정된 바닷길을 따라 이동하는 전장"
          />
          {SITES.map((p, i) => {
            const t = hud.towers.find((t) => t.site === i),
              Icon = t ? icons[t.kind] : Plus
            return (
              <button
                key={i}
                className={`td-site ${t ? 'td-site-built td-site-' + t.kind : ''} ${selected === i ? 'td-site-selected' : ''}`}
                style={{ left: (p.x / 420) * 100 + '%', top: (p.y / 520) * 100 + '%' }}
                aria-label={
                  t ? `${i + 1}번 ${TOWERS[t.kind].name} 레벨 ${t.level}` : `${i + 1}번 설치 지점`
                }
                aria-pressed={selected === i}
                disabled={!editable}
                onClick={() => select(i)}
              >
                <Icon size={t ? 23 : 18} />
                {t && <small>{t.level}</small>}
              </button>
            )
          })}
          {hud.phase !== 'ready' && !ended && (
            <div className="td-wave-label">
              {hud.phase === 'build'
                ? hud.wave
                  ? `WAVE ${hud.wave} CLEAR · 재정비 시간`
                  : 'PREPARE · 설치 지점을 눌러 타워를 세워요'
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
                    길목에 타워를 세우고
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
                    조합과 위치로 밀려오는 적을 막아보세요.
                  </>
                )}
              </p>
              {hud.phase === 'ready' && (
                <div className="td-instructions">
                  <span>
                    01 <b>빈 설치 지점을 선택하고 타워 설치</b>
                  </span>
                  <span>
                    02 <b>준비가 되면 웨이브 시작</b>
                  </span>
                  <span>
                    03 <b>처치한 조개로 타워 강화 · 5웨이브 방어</b>
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
              ? '설치 지점을 선택하세요'
              : `${selected + 1}번 ${tower ? config!.name + ' · Lv.' + tower.level : '설치 지점'}`}
          </b>
          <span>
            {tower
              ? `사거리 ${towerRange(tower)} · ${tower.kills}마리 처치`
              : '사거리 안의 적을 자동 공격해요'}
          </span>
        </div>
        {tower ? (
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
      </div>
      <div className="td-bottom">
        <span>
          {hud.phase === 'build'
            ? hud.wave
              ? '조개를 받았어요. 다음 파도에 대비하세요.'
              : '180조개로 첫 방어선을 만들어보세요.'
            : '전투 중에도 설치·강화할 수 있어요.'}
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
