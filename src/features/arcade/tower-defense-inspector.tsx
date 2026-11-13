import { ArrowRight, ArrowUp, Coins } from 'lucide-react'
import { TowerArt } from './tower-defense-art'
import { TowerAttackBadge } from './tower-defense-attack-badge'
import { BUILDINGS, sellValue, upgradeCost, type Building } from './tower-defense-engine'
import { statNumber, TOWER_DESCRIPTIONS } from './tower-defense-towers'

export function TowerInspector({
  building: b,
  active,
  gold,
  onUpgrade,
  onSell,
}: {
  building: Building
  active: boolean
  gold: number
  onUpgrade: () => void
  onSell: () => void
}) {
  const spec = BUILDINGS[b.kind],
    maxed = b.level === 3,
    next = Math.min(3, b.level + 1)
  const stats: { label: string; values: readonly number[]; unit: string }[] = [
    { label: b.kind === 'flame' ? '초당 공격력' : '공격력', values: spec.damage, unit: '' },
    { label: '공격 주기', values: spec.interval, unit: '초' },
    { label: '사거리', values: spec.range, unit: '칸' },
  ]
  if (b.kind === 'frost')
    stats.push({
      label: '이동 감속',
      values: spec.slow.map((value) => Math.round((1 - value) * 100)),
      unit: '%',
    })
  return (
    <div className="td-tower-panel">
      <div className="td-tower-heading">
        <div className="td-tower-portrait">
          <TowerArt kind={b.kind} />
        </div>
        <div>
          <strong>
            {spec.name}
            <TowerAttackBadge kind={b.kind} />
            <small>Lv.{b.level}</small>
          </strong>
        </div>
      </div>
      {b.kind !== 'wall' && (
        <details className="td-tower-details">
          <summary>능력치 보기</summary>
          <div className="td-tower-detail-body">
            <p>{TOWER_DESCRIPTIONS[b.kind]}</p>
            {spec.chargeTime > 0 && (
              <p>조준 {statNumber(spec.chargeTime)}초 · 공격 주기에 포함돼요.</p>
            )}
            <table className="td-stat-table" aria-label={`${spec.name} 강화 능력치 비교`}>
              <thead>
                <tr>
                  <th scope="col">능력치</th>
                  <th scope="col">현재</th>
                  <th scope="col">{maxed ? '최대 강화' : '강화 후'}</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat) => (
                  <tr key={stat.label}>
                    <th scope="row">{stat.label}</th>
                    <td>
                      {statNumber(stat.values[b.level])}
                      <small>{stat.unit}</small>
                    </td>
                    <td>
                      {maxed ? (
                        <span className="td-stat-max">—</span>
                      ) : (
                        <>
                          <ArrowRight size={11} aria-hidden="true" />
                          {statNumber(stat.values[next])}
                          <small>{stat.unit}</small>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <div className="td-tower-actions">
        {b.kind !== 'wall' && (
          <button
            className="td-upgrade"
            aria-label={maxed ? '최대 강화 3' : `강화 ${upgradeCost(b)}`}
            disabled={!active || maxed || gold < upgradeCost(b)}
            onClick={onUpgrade}
          >
            <ArrowUp size={14} />
            <span>{maxed ? '최대 강화' : '강화'}</span>
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
      </div>
    </div>
  )
}
