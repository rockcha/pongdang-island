import { BUILDINGS, type BuildKind } from './tower-defense-towers'

export function TowerAttackBadge({
  kind,
  hybrid = false,
  bombard = false,
}: {
  kind: BuildKind
  hybrid?: boolean
  bombard?: boolean
}) {
  const { attack } = BUILDINGS[kind]
  const targetLayer = hybrid ? 'both' : BUILDINGS[kind].targetLayer
  const type =
    (attack === 'single' || attack === 'snipe') && !bombard
      ? 'single'
      : attack === 'wall'
        ? 'wall'
        : 'area'
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
