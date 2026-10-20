import { useEffect, useState } from 'react'
import {
  LADDER_WIPE_MS,
  LADDER_TRAVEL_MS,
  ladderDisplayRun,
  ladderModes,
  ladderRoute,
  type LadderMode,
  type LadderRun,
} from './ladder-model'

export function LadderBoard({
  choice,
  run: serverRun,
  mode,
  revealing,
  finished,
  onChoice,
  disabled,
  hidePaths = false,
}: {
  choice: number | null
  run: LadderRun | null
  mode: LadderMode
  revealing: boolean
  finished: boolean
  onChoice: (choice: number) => void
  disabled: boolean
  hidePaths?: boolean
}) {
  const [readyRun, setReadyRun] = useState<string | null>(null)
  const wiping = revealing && readyRun !== serverRun?.id
  useEffect(() => {
    if (!revealing || !serverRun) return
    const timer = setTimeout(() => setReadyRun(serverRun.id), LADDER_WIPE_MS)
    return () => clearTimeout(timer)
  }, [revealing, serverRun?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const run = serverRun ? ladderDisplayRun(serverRun) : null
  const payouts = ladderModes[mode].payouts
  const route = run ? ladderRoute(run.choice, run.bridges).path : null
  return (
    <div
      className={`ladder-board ladder-board-picking ${revealing ? 'ladder-board-departing' : ''} ${finished && run ? (run.reward > run.stake ? 'ladder-board-won' : run.reward < run.stake ? 'ladder-board-lost' : '') : ''}`}
    >
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
            <span className="ladder-shell" aria-hidden="true" />
            <span>{i + 1}</span>
          </button>
        ))}
      </div>
      {hidePaths && (
        <div className={`ladder-hidden-paths ${revealing ? 'ladder-voyage' : ''}`} role="status">
          {revealing && (
            <div key={run?.id} className="ladder-voyage-animation" aria-hidden="true">
              <span className="ladder-voyage-wave" />
              <span className="ladder-voyage-wave ladder-voyage-wave-follow" />
              <span className="ladder-voyage-shell">
                <span className="ladder-shell" />
              </span>
            </div>
          )}
          <span className="ladder-voyage-caption">
            {revealing
              ? '어떤 조개에 도착할까요…'
              : finished
                ? '도착했어요!'
                : '조개 아래에 행운이 기다려요'}
          </span>
        </div>
      )}
      {!hidePaths && (
        <svg
          viewBox="0 0 360 206"
          preserveAspectRatio="none"
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
              <path
                key={row}
                d={`M${45 + col * 90},${40 + row * (144 / Math.max(1, run.bridges.length))} h90`}
                className="ladder-rope"
              />
            ),
          )}
          {route && !wiping && (
            <path
              key={run?.id}
              d={route}
              pathLength="1"
              style={{ animationDuration: `${LADDER_TRAVEL_MS}ms` }}
              className={`ladder-route ${revealing ? 'ladder-route-revealing' : ''}`}
            />
          )}
          {wiping && (
            <g className="ladder-wipe" aria-label="조개로 가림막을 걷는 중">
              <rect
                width="360"
                height="206"
                rx="12"
                className="ladder-wipe-cover"
                style={{ animationDuration: `${LADDER_WIPE_MS}ms` }}
              />
              <image
                href="/arcade/ladder/shell.png"
                x="-28"
                y="-28"
                width="56"
                height="56"
                aria-hidden="true"
              >
                <animateMotion
                  path="M0,103 Q90,50 180,103 T360,103"
                  dur={`${LADDER_WIPE_MS}ms`}
                  fill="freeze"
                  calcMode="paced"
                />
              </image>
            </g>
          )}
        </svg>
      )}
      {
        <div className="ladder-endpoints" aria-label="도착 배당">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={`${run?.id ?? 'waiting'}:${i}`}
              className={finished && run?.destination === i ? 'ladder-arrived' : ''}
            >
              <span
                aria-hidden="true"
                className={`ladder-shell ${finished && run?.destination === i ? 'ladder-shell-open' : ''}`}
              />
              <span>×{payouts[i] / 100}</span>
            </div>
          ))}
        </div>
      }
    </div>
  )
}
