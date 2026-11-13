import type { BuildKind } from './tower-defense-engine'
export function TowerArt({ kind, className = '' }: { kind: BuildKind; className?: string }) {
  return (
    <img
      src={`/arcade/tower-defense/${kind}-${kind === 'wall' ? 'v2' : ['missile', 'salvo', 'sniper', 'harpoon', 'frost', 'cruise'].includes(kind) ? 'v1' : 'v5'}.svg`}
      alt=""
      draggable={false}
      aria-hidden="true"
      className={`td-piece ${className}`}
    />
  )
}
