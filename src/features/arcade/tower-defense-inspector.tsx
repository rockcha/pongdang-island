import {
  ArrowUp,
  Coins,
  MoveRight,
  SlidersHorizontal,
  Swords,
  Timer,
  Scan,
  Snowflake,
} from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { TowerArt } from './tower-defense-art'
import { TowerAttackBadge } from './tower-defense-attack-badge'
import {
  BUILDINGS,
  sellValue,
  upgradeCost,
  damageOf,
  intervalOf,
  specializationCost,
  specializationOptions,
  type Building,
} from './tower-defense-engine'
import {
  statNumber,
  TOWER_DESCRIPTIONS,
  SPECIALIZATION_LABELS,
  specializationDescription,
  type TowerSpecialization,
} from './tower-defense-towers'

export function TowerInspector({
  building: b,
  active,
  gold,
  onUpgrade,
  onSell,
  onMove,
  canSpecialize = false,
  onSpecialize,
}: {
  building: Building
  active: boolean
  gold: number
  onUpgrade: () => void
  onSell: () => void
  onMove?: () => void
  canSpecialize?: boolean
  onSpecialize?: (kind: TowerSpecialization) => void
}) {
  const [specializing, setSpecializing] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const spec = BUILDINGS[b.kind],
    maxed = b.level === 3,
    next = Math.min(3, b.level + 1)
  const stats = [
    {
      label: b.kind === 'flame' ? '초당 공격력' : '공격력',
      current: damageOf(b) / (b.kind === 'flame' && b.specialization === 'rapid' ? 0.8 : 1),
      next: spec.damage[next],
      unit: '',
      icon: Swords,
    },
    {
      label: '공격 주기',
      current: intervalOf(b),
      next: spec.interval[next],
      unit: '초',
      icon: Timer,
    },
    {
      label: '사거리',
      current: spec.range[b.level],
      next: spec.range[next],
      unit: '칸',
      icon: Scan,
    },
  ]
  if (b.kind === 'frost')
    stats.push({
      label: '이동 감속',
      current: Math.round(
        (1 -
          (b.specialization === 'power'
            ? Math.max(0.35, spec.slow[b.level] - 0.1)
            : spec.slow[b.level])) *
          100,
      ),
      next: Math.round((1 - spec.slow[next]) * 100),
      unit: '%',
      icon: Snowflake,
    })
  return (
    <div className="td-tower-panel">
      <div className="td-tower-heading">
        <div className="td-tower-portrait">
          <TowerArt kind={b.kind} />
          {b.kind !== 'wall' && (
            <span className="td-strength-badge" aria-label={`${b.level}단계 강화`}>
              {b.level}
            </span>
          )}
        </div>
        <div>
          <strong>{spec.name}</strong>
          <div className="td-tower-meta">
            <TowerAttackBadge
              kind={b.kind}
              hybrid={b.specialization === 'hybrid'}
              bombard={b.specialization === 'bombard'}
            />
            {b.specialization && (
              <span className="td-specialization-tag">
                {SPECIALIZATION_LABELS[b.specialization]}
              </span>
            )}
          </div>
        </div>
        {b.kind !== 'wall' && (
          <button
            className="td-stats-trigger"
            aria-label="능력치 보기"
            onClick={(event) => {
              setPortalContainer(event.currentTarget.closest('dialog'))
              setShowStats(true)
            }}
          >
            <SlidersHorizontal size={14} />
            능력치
          </button>
        )}
      </div>
      <AlertDialog open={showStats} onOpenChange={setShowStats}>
        <AlertDialogContent
          portalContainer={portalContainer ?? undefined}
          className="td-stats-dialog"
        >
          <div className="td-stats-heading">
            <div className="td-tower-portrait">
              <TowerArt kind={b.kind} />
              <span className="td-strength-badge" aria-label={`${b.level}단계 강화`}>
                {b.level}
              </span>
            </div>
            <div>
              <AlertDialogTitle aria-label={`${spec.name} 능력치`}>{spec.name}</AlertDialogTitle>
              <div className="td-tower-meta">
                <TowerAttackBadge
                  kind={b.kind}
                  hybrid={b.specialization === 'hybrid'}
                  bombard={b.specialization === 'bombard'}
                />
                {b.specialization && (
                  <span className="td-specialization-tag">
                    {SPECIALIZATION_LABELS[b.specialization]}
                  </span>
                )}
              </div>
            </div>
          </div>
          <AlertDialogDescription className="td-stats-description">
            {b.specialization === 'hybrid' ? '기본 형태 · ' : ''}
            {TOWER_DESCRIPTIONS[b.kind]}
          </AlertDialogDescription>
          <p className="td-balance" aria-label={`건설 코인 ${gold}`}>
            <Coins size={14} />
            <span>건설 코인</span>
            <strong>{gold.toLocaleString()}</strong>
          </p>
          <table
            className={`td-stat-table${maxed ? ' is-maxed' : ''}`}
            aria-label={`${spec.name} 강화 능력치 비교`}
          >
            <thead>
              <tr>
                <th scope="col">능력치</th>
                <th scope="col">
                  <span>현재</span>
                  <span className="td-stat-stage" aria-label={`${b.level}단계`}>
                    {b.level}
                  </span>
                </th>
                {!maxed && (
                  <th scope="col">
                    <span>강화 후</span>
                    <span className="td-stat-stage">{next}</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {stats.map(({ label, current, next, unit, icon: Icon }) => (
                <tr key={label}>
                  <th scope="row">
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </th>
                  <td>
                    <strong>{statNumber(current)}</strong>
                    <small>{unit}</small>
                  </td>
                  {!maxed && (
                    <td>
                      <strong>{statNumber(next)}</strong>
                      <small>{unit}</small>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {b.specialization && (
            <p className="td-stats-note">
              {specializationDescription(b.kind, b.specialization)}
              {b.specialization === 'hybrid' ? ' · 동시 공격 수는 유지돼요.' : ''}
            </p>
          )}
          {spec.chargeTime > 0 && (
            <p className="td-stats-note">
              조준 {statNumber(spec.chargeTime)}초 · 공격 주기에 포함돼요.
            </p>
          )}
          <div className="td-stats-footer">
            {maxed ? (
              <span>최대 강화</span>
            ) : (
              <span>
                <Coins size={13} />
                {upgradeCost(b)}
                <small>강화 비용</small>
              </span>
            )}
            <AlertDialogCancel>닫기</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <div className="td-tower-actions">
        {b.kind !== 'wall' && (
          <button
            className="td-upgrade"
            aria-label={
              maxed
                ? canSpecialize && !b.specialization
                  ? '특화 선택'
                  : '최대 강화 3'
                : `강화 ${upgradeCost(b)}`
            }
            disabled={
              !active || (maxed ? !canSpecialize || !!b.specialization : gold < upgradeCost(b))
            }
            onClick={(event) => {
              if (maxed) {
                setPortalContainer(event.currentTarget.closest('dialog'))
                setSpecializing(true)
              } else onUpgrade()
            }}
          >
            <ArrowUp size={14} />
            <span>
              {maxed ? (canSpecialize && !b.specialization ? '특화' : '최대 강화') : '강화'}
            </span>
            {!maxed && (
              <small>
                <Coins size={12} />
                {upgradeCost(b)}
              </small>
            )}
          </button>
        )}
        <button
          className="td-sell"
          aria-label={`판매 +${sellValue(b)}`}
          disabled={!active}
          title="설치·강화에 쓴 코인의 50%를 돌려받아요."
          onClick={onSell}
        >
          <span>판매</span>
          <small>
            <Coins size={12} />+{sellValue(b)}
          </small>
        </button>
        {b.kind !== 'wall' && onMove && (
          <button className="td-move" disabled={!active} onClick={onMove}>
            <MoveRight size={13} />
            이동
          </button>
        )}
      </div>
      <AlertDialog open={specializing} onOpenChange={setSpecializing}>
        <AlertDialogContent portalContainer={portalContainer ?? undefined} className="max-w-sm">
          <AlertDialogTitle>{spec.name} 특화</AlertDialogTitle>
          <AlertDialogDescription>
            최대 강화 타워의 마지막 특화예요. 한 가지만 선택할 수 있어요.
          </AlertDialogDescription>
          <p className="td-balance" aria-label={`건설 코인 ${gold}`}>
            <Coins size={14} />
            <span>건설 코인</span>
            <strong>{gold.toLocaleString()}</strong>
          </p>
          <div className="td-specialization">
            <div>
              {specializationOptions(b.kind).map((kind) => (
                <button
                  key={kind}
                  disabled={
                    !active ||
                    !canSpecialize ||
                    !!b.specialization ||
                    gold < specializationCost(b, kind)
                  }
                  onClick={() => {
                    onSpecialize?.(kind)
                    setSpecializing(false)
                  }}
                >
                  <strong>{SPECIALIZATION_LABELS[kind]}</strong>
                  <span>{specializationDescription(b.kind, kind)}</span>
                  <small>
                    <Coins size={11} />
                    {specializationCost(b, kind)}
                  </small>
                </button>
              ))}
            </div>
          </div>
          <AlertDialogCancel>취소</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
