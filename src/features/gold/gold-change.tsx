/** Shared wallet feedback, also usable inside a native game's top layer. */
export function GoldChange({
  delta,
  resource = 'gold',
  icon,
  name,
}: {
  delta: number
  resource?: 'gold' | 'fuel' | 'experience' | 'bait'
  icon?:string
  name?:string
}) {
  if (!delta) return null
  return (
    <div
      className={`gold-change flex items-center gap-2 py-1 ${delta > 0 ? 'gold-change-gain' : 'gold-change-loss'} ${resource === 'experience' ? 'experience-change' : ''}`}
    >
      <span className="gold-change-number">
        {delta > 0 ? '+' : '−'}
        {Math.abs(delta).toLocaleString('ko-KR')}
        {resource === 'experience' && ' XP'}
      </span>
      {resource !== 'experience' && <img
        src={resource === 'bait' ? icon??'/app-icons/bait.png' : resource === 'fuel' ? '/app-icons/fuel-can.svg' : '/currency/gold-coin-starfish.png'}
        alt=""
        aria-hidden="true"
        className="gold-change-coin shrink-0 object-contain"
      />}
      {delta > 0 && (
        <span aria-hidden="true">
          <i className="gold-change-sparkle" />
          <i className="gold-change-sparkle" />
          <i className="gold-change-sparkle" />
        </span>
      )}
      <span className="sr-only">{resource === 'bait' ? name??'미끼' : resource === 'experience' ? '경험치' : resource === 'fuel' ? '연료' : '골드'}</span>
    </div>
  )
}
