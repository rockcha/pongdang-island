import { BUILDINGS, type BuildKind } from './tower-defense-towers'

export function TowerAttackBadge({ kind }: { kind: BuildKind }) {
  const { attack, targetLayer } = BUILDINGS[kind]
  const type =
    attack === 'single' || attack === 'snipe' ? 'single' : attack === 'wall' ? 'wall' : 'area'
  return (
    <>
      {targetLayer === 'air' && <span className="td-air-badge">공중 전용</span>}
      {targetLayer === 'both' && <span className="td-air-badge">지상·공중</span>}
      <span className={`td-attack-badge is-${type}`}>
        {attack === 'frost'
          ? '감속'
          : attack === 'salvo'
            ? '다중'
            : type === 'single'
              ? '단일'
              : type === 'area'
                ? '광역'
                : '구조물'}
      </span>
    </>
  )
}
