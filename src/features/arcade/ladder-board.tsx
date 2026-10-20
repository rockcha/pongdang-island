import { ladderRoute, type LadderRun } from './ladder-model'

export function LadderBoard({
  choice,
  run,
  revealing,
  finished,
  onChoice,
  disabled,
}: {
  choice: number | null
  run: LadderRun | null
  revealing: boolean
  finished: boolean
  onChoice: (choice: number) => void
  disabled: boolean
}) {
  const route = run ? ladderRoute(run.choice, run.bridges).path : null
  return (
    <div className="ladder-board">
      <div role="group" aria-label="출발할 사다리 선택" className="ladder-choices">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}번 사다리`}
            aria-pressed={choice === i}
            disabled={disabled}
            onClick={() => onChoice(i)}
          >
            <img src="/arcade/ladder/shell.png" alt="" width="48" height="48" />
            <span>{i + 1}</span>
          </button>
        ))}
      </div>
      <svg
        viewBox="0 0 360 234"
        role="img"
        aria-label={
          finished
            ? '도착한 사다리 경로'
            : revealing
              ? '선택한 사다리를 따라 내려가는 중'
              : '선택 후 공개되는 사다리'
        }
      >
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${45 + i * 90},20 V202`} className="ladder-rope" />
        ))}
        {!run && (
          <g aria-hidden="true">
            <rect x="77" y="92" width="206" height="34" rx="8" className="ladder-curtain" />
            <text x="180" y="114" textAnchor="middle" className="ladder-curtain-detail">
              출발하면 길이 나타나요
            </text>
          </g>
        )}
        {run?.bridges.map((col, row) =>
          col < 0 ? null : (
            <path key={row} d={`M${45 + col * 90},${40 + row * 12} h90`} className="ladder-rope" />
          ),
        )}
        {route && (
          <path
            key={run?.id}
            d={route}
            pathLength="1"
            className={`ladder-route ${revealing ? 'ladder-route-revealing' : ''}`}
          />
        )}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect
              x={16 + i * 90}
              y="200"
              width="58"
              height="30"
              rx="8"
              className="ladder-end"
            />
            <text x={45 + i * 90} y="220" textAnchor="middle" className="ladder-end-label">
              {run ? `×${run.payouts[i] / 100}` : '?'}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
