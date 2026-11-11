import { useId } from 'react'
import type { CSSProperties } from 'react'
import type { PetInteractionAction, PetSpeciesId } from './pet-catalog'
import { petStageLayout, petGroundY } from './pet-draw-layout'
import './pet-care-effects.css'
const stagger = (i: number) => ({ '--i': i }) as CSSProperties
// Decorative SVG only; existing pet motion and the care timer own completion.
export function PetCareEffects({
  action,
  speciesId,
}: {
  action: PetInteractionAction
  speciesId: PetSpeciesId
}) {
  const id = `pet-care-${useId().replaceAll(':', '')}`
  const ground = petGroundY(speciesId) * 300 / 640
  const head = petStageLayout(speciesId).anchor.map(n => n * 300 / 640)
  const biteStyle = (i: number) =>
    ({
      ...stagger(i),
      '--bite-x': `${(petStageLayout(speciesId).anchor[0] * 300) / 640 - 150}px`,
      '--bite-y': `${head[1] + 13 - ground + 6}px`,
    }) as CSSProperties
  return (
    <div
      className={`pet-care-fx pet-care-fx-${action}`}
      data-pet-care-effect={action}
      data-species={speciesId}
      aria-hidden="true"
    >
      <svg
        className="pet-fx-art"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${id}-cream`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fffdf6" />
            <stop offset="1" stopColor="#ead8bf" />
          </linearGradient>
          <radialGradient id={`${id}-bubble`} cx=".3" cy=".22" r=".8">
            <stop stopColor="#fff" stopOpacity=".9" />
            <stop offset=".45" stopColor="#e1f1f0" stopOpacity=".18" />
            <stop offset="1" stopColor="#b4d9dd" stopOpacity=".45" />
          </radialGradient>
          <linearGradient id={`${id}-ball`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f1d49f" />
            <stop offset="1" stopColor="#dbb477" />
          </linearGradient>
          <symbol id={`${id}-heart`} viewBox="0 0 24 24">
            <path
              d="M12 20S3.5 15.1 3.5 8.9a4.6 4.6 0 0 1 8.5-2.4 4.6 4.6 0 0 1 8.5 2.4C20.5 15.1 12 20 12 20Z"
              fill="#e58fa9"
              fillOpacity=".95"
              stroke="#bf6b89"
              strokeWidth="1.4"
            />
          </symbol>
          <symbol id={`${id}-spark`} viewBox="0 0 24 24">
            <path
              d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7L12 2Z"
              fill="#ffe3a2"
              stroke="#c5994b"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </symbol>
        </defs>
        {action === 'feed' && (
          <>
            <g transform={`translate(-30 ${ground - 290}) scale(1.2)`}>
            <g className="pet-fx-food-bowl">
              <ellipse cx="150" cy="262" rx="34" ry="4" fill="#c9b699" opacity=".12" />
              <path
                d="M116 238h68l-7 19c-2 5-52 5-54 0Z"
                fill={`url(#${id}-cream)`}
                stroke="#bda98e"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <path d="m120 249 3 8c2 4 52 4 54 0l3-8" fill="#bfceba" fillOpacity=".65" />
              <ellipse
                cx="150"
                cy="238"
                rx="34"
                ry="8"
                fill="#fff9e9"
                stroke="#c7b69d"
                strokeWidth="1.1"
              />
              <ellipse cx="150" cy="238" rx="27" ry="5" fill="#d9c1a1" opacity=".5" />
              {[
                [133, 237],
                [143, 235],
                [154, 238],
                [165, 236],
                [139, 240],
                [158, 241],
              ].map(([x, y], i) => (
                <g key={i} className="pet-fx-kibble" style={stagger(i)}>
                  <ellipse cx={x} cy={y} rx="3.4" ry="2.3" fill={i % 2 ? '#b88b5e' : '#cfa774'} />
                  <path
                    d={`M${x - 1} ${y - 1}h1.5`}
                    stroke="#e9cc9b"
                    strokeWidth=".8"
                    strokeLinecap="round"
                  />
                </g>
              ))}
              <path
                d="M150 256s-4-2.2-4-4.6c0-2 2.9-2.8 4-.8 1.1-2 4-1.2 4 .8 0 2.4-4 4.6-4 4.6Z"
                fill="#93ab96"
              />
            </g>
            </g>
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(150 ${ground - 6})`}>
                <g className="pet-fx-bite" style={biteStyle(i)}>
                  <ellipse rx="4.2" ry="3" fill="#ad7746" stroke="#f3d8a5" strokeWidth="1" />
                </g>
              </g>
            ))}
            <g
              transform={`translate(${(petStageLayout(speciesId).anchor[0] * 300) / 640 + 26} ${(petStageLayout(speciesId).anchor[1] * 300) / 640 - 8})`}
            >
              <use className="pet-fx-clean" href={`#${id}-spark`} width="20" height="20" />
            </g>
            <g transform={`translate(${head[0] - 35} ${head[1] + 8})`}><use className="pet-fx-heart" style={stagger(4)} href={`#${id}-heart`} width="22" height="22"/></g>
          </>
        )}
        {action === 'stroke' && (
          <>
            <g transform={`translate(${head[0] - 26} ${Math.max(24, head[1] - 75)}) scale(1.3)`}>
              <g className="pet-fx-hand">
                <path
                  d="m5 23-3-8c-1-3 2-4 3-2l3 5-4-13c-.8-3 2.7-4 3.6-1l3.8 10-2-13c-.5-3 3-3.5 3.6-.5l2.7 13 .1-11c0-3 3.5-3 3.5 0l.8 12 2-6c1-2.5 4-.8 3.1 1.6l-2.6 11c-1 6-4.9 9-10 8.3C9 29 6.8 27 5 23Z"
                  fill={`url(#${id}-cream)`}
                  stroke="#a38461"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 21c1-2.5 3-4 5-4"
                  stroke="#cfb79c"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </g>
            </g>
            {[
              [head[0] - 70, head[1] + 8],
              [head[0] - 22, Math.max(30, head[1] - 65)],
              [head[0] + 48, head[1] + 10],
            ].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <g className="pet-fx-heart" style={stagger(i)}>
                  <use href={`#${id}-heart`} width={i === 1 ? 25 : 21} height={i === 1 ? 25 : 21} />
                </g>
              </g>
            ))}
            <ellipse className="pet-fx-touch" cx={head[0] - 5} cy={Math.max(35,head[1] - 45)} rx="22" ry="9" stroke="#dcb16f" strokeWidth="2"/>
          </>
        )}
        {action === 'bath' && (
          <>
            <g transform={`translate(0 ${ground - 240})`}>
            <g className="pet-fx-foam">
              <path
                d="M72 235c-11-10-3-26 10-25-3-16 15-28 28-17 4-18 28-21 37-5 12-16 34-7 33 9 16-9 34 4 30 19 17-1 26 18 13 27-8 8-145 10-151-8Z"
                fill="#fffdf5"
                fillOpacity=".96"
                stroke="#90bdb9"
                strokeWidth="1.7"
              />
              <path
                d="M86 229c4-8 15-8 19-1m12-24c6-9 19-7 21 2m10 20c4-9 17-10 22-2m14-11c5-8 16-6 18 1"
                stroke="#b1d4ce"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </g>
            </g>
            <g className="pet-fx-shower" strokeLinecap="round">
              <path d="m62 42 13-10 17 14-7 9Z" fill="#ccded4" stroke="#83a69b" strokeWidth="1.6"/>
              <path d="m84 57 14 20m-4-26 16 22m-7-27 17 21" stroke="#8bc2cf" strokeWidth="2.8" strokeDasharray="5 7"/>
            </g>
            {[
              [72, ground - 35, 11],
              [211, ground - 48, 15],
              [101, ground - 9, 8],
              [229, ground - 88, 9],
              [185, ground - 22, 11],
            ].map(([x, y, r], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <g className="pet-fx-bubble" style={stagger(i)}>
                  <circle r={r} fill={`url(#${id}-bubble)`} stroke="#79afbb" strokeWidth="1.5" />
                  <path
                    d={`M${-r * 0.5} ${-r * 0.2}q0 ${-r * 0.4} ${r * 0.5} ${-r * 0.4}`}
                    stroke="#fff"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </g>
              </g>
            ))}
            <g transform={`translate(${head[0] + 45} ${head[1] - 8})`}>
              <use className="pet-fx-clean" href={`#${id}-spark`} width="25" height="25" />
            </g>
            <g transform={`translate(${head[0] - 60} ${head[1] + 15})`}><use className="pet-fx-clean" href={`#${id}-spark`} width="18" height="18"/></g>
          </>
        )}
        {action === 'sleep' && (
          <>
            <ellipse className="pet-fx-flash" cx="150" cy="145" rx="105" ry="115" fill="#fff9e5"/>
            <g
              className="pet-fx-photo-frame"
              stroke="#a48963"
              strokeWidth="2.3"
              strokeLinecap="round"
            >
              <path d="M71 66V53q0-7 7-7h15M207 46h15q7 0 7 7v13M71 222v15q0 7 7 7h15M207 244h15q7 0 7-7v-15" />
            </g>
            <g transform="translate(62 52) scale(1.35)">
              <g className="pet-fx-camera">
                <path
                  d="m5 6 3-4h9l3 4h6a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H2a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z"
                  fill={`url(#${id}-cream)`}
                  stroke="#ad9981"
                  strokeWidth="1.15"
                />
                <rect x="20" y="9" width="5" height="3" rx="1" fill="#d9c5a6" />
                <circle cx="13" cy="17" r="7" fill="#dce6df" stroke="#a6b6af" strokeWidth="1.1" />
                <circle cx="13" cy="17" r="4.1" fill="#a3b6b0" />
                <path
                  d="M11 14a3 3 0 0 1 3-1"
                  stroke="#f8f9ee"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <circle
                  className="pet-fx-shutter"
                  cx="13"
                  cy="17"
                  r="10"
                  stroke="#d5bd89"
                  strokeWidth="1"
                />
              </g>
            </g>
            <g transform={`translate(210 ${ground - 30}) rotate(8 16 19) scale(1.25)`}>
              <g className="pet-fx-photo-print">
                <rect
                  width="32"
                  height="38"
                  rx="3"
                  fill="#fffcf4"
                  stroke="#d4c6b2"
                  strokeWidth="1"
                />
                <rect x="4" y="4" width="24" height="24" rx="1.5" fill="#e5ece3" />
                <use href={`#${id}-heart`} x="8" y="9" width="16" height="16" />
                <path d="M10 33h12" stroke="#dfd1c0" strokeWidth="1.2" strokeLinecap="round" />
              </g>
            </g>
          </>
        )}
        {action === 'play' && (
          <>
            <path className="pet-fx-trail" d={`M72 ${ground - 5}q45-76 90 0t70-8`} stroke="#a4c6b6" strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round"/>
            <g transform={`translate(72 ${ground - 5})`}>
              <g className="pet-fx-ball">
                <circle r="16" fill={`url(#${id}-ball)`} stroke="#b18a56" strokeWidth="1.5" />
                <path d="M-13-9C-2-2 2 3 9 13" stroke="#fff9e8" strokeWidth="5" />
                <path d="M-10 12c6-2 13-9 17-25" stroke="#88ad93" strokeWidth="4" />
                <path
                  d="M-5-7a8 8 0 0 1 5-1"
                  stroke="#fff5dc"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </g>
            </g>
            {[
              [68, 94],
              [225, 52],
              [236, 172],
            ].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <use
                  className="pet-fx-star"
                  style={stagger(i)}
                  href={`#${id}-spark`}
                  width={i === 1 ? 23 : 19}
                  height={i === 1 ? 23 : 19}
                />
              </g>
            ))}
          </>
        )}
      </svg>
    </div>
  )
}
