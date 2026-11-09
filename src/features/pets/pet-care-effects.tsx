import { useId } from 'react'
import type { CSSProperties } from 'react'
import type { PetInteractionAction, PetSpeciesId } from './pet-catalog'
import renderLayouts from './pet-render-layouts.json'
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
  const biteStyle = (i: number) =>
    ({
      ...stagger(i),
      '--bite-x': `${(renderLayouts[speciesId].anchor[0] * 300) / 640 - 150}px`,
      '--bite-y': `${(renderLayouts[speciesId].anchor[1] * 300) / 640 + 13 - 238}px`,
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
              fill="#e7b6c1"
              fillOpacity=".65"
              stroke="#c992a2"
              strokeWidth="1.2"
            />
          </symbol>
          <symbol id={`${id}-spark`} viewBox="0 0 24 24">
            <path
              d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7L12 2Z"
              fill="#f0deb4"
              stroke="#d0ad6d"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </symbol>
        </defs>
        {action === 'feed' && (
          <>
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
            {[0, 1, 2].map((i) => (
              <g key={i} transform="translate(150 238)">
                <g className="pet-fx-bite" style={biteStyle(i)}>
                  <ellipse rx="2.7" ry="2" fill="#bb9061" stroke="#e9d4aa" strokeWidth=".6" />
                </g>
              </g>
            ))}
            <g
              transform={`translate(${(renderLayouts[speciesId].anchor[0] * 300) / 640 + 26} ${(renderLayouts[speciesId].anchor[1] * 300) / 640 - 8})`}
            >
              <use className="pet-fx-clean" href={`#${id}-spark`} width="13" height="13" />
            </g>
          </>
        )}
        {action === 'stroke' && (
          <>
            <g transform="translate(184 38)">
              <g className="pet-fx-hand">
                <path
                  d="m5 23-3-8c-1-3 2-4 3-2l3 5-4-13c-.8-3 2.7-4 3.6-1l3.8 10-2-13c-.5-3 3-3.5 3.6-.5l2.7 13 .1-11c0-3 3.5-3 3.5 0l.8 12 2-6c1-2.5 4-.8 3.1 1.6l-2.6 11c-1 6-4.9 9-10 8.3C9 29 6.8 27 5 23Z"
                  fill={`url(#${id}-cream)`}
                  stroke="#b4997c"
                  strokeWidth="1.25"
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
              [72, 110],
              [140, speciesId === 'sand-golem' ? 35 : 65],
              [224, 106],
            ].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <g className="pet-fx-heart" style={stagger(i)}>
                  <use href={`#${id}-heart`} width={i === 1 ? 13 : 11} height={i === 1 ? 13 : 11} />
                </g>
              </g>
            ))}
          </>
        )}
        {action === 'bath' && (
          <>
            <g className="pet-fx-foam">
              <path
                d="M86 240c-5-8 3-17 13-14 2-11 17-13 23-4 7-10 22-9 26 1 9-8 22-5 24 4 11-7 24 0 22 9 10-2 19 6 15 12H89c-8 0-11-6-3-8Z"
                fill="#fffdf5"
                fillOpacity=".88"
                stroke="#d2e4df"
                strokeWidth="1"
              />
              <path
                d="M103 237c2-4 8-5 12-2m27-4c4-3 9-2 11 1m24 5c3-3 8-3 11 0"
                stroke="#d2e4df"
                strokeLinecap="round"
              />
            </g>
            {[
              [72, 191, 7],
              [218, 184, 10],
              [85, 216, 5],
              [236, 154, 5],
              [203, 212, 7],
            ].map(([x, y, r], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <g className="pet-fx-bubble" style={stagger(i)}>
                  <circle r={r} fill={`url(#${id}-bubble)`} stroke="#a8cbd1" strokeWidth=".9" />
                  <path
                    d={`M${-r * 0.5} ${-r * 0.2}q0 ${-r * 0.4} ${r * 0.5} ${-r * 0.4}`}
                    stroke="#fff"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </g>
              </g>
            ))}
            <g transform="translate(226 89)">
              <use className="pet-fx-clean" href={`#${id}-spark`} width="18" height="18" />
            </g>
          </>
        )}
        {action === 'sleep' && (
          <>
            <g
              className="pet-fx-photo-frame"
              stroke="#bcad98"
              strokeWidth="1.25"
              strokeLinecap="round"
            >
              <path d="M71 66V53q0-7 7-7h15M207 46h15q7 0 7 7v13M71 222v15q0 7 7 7h15M207 244h15q7 0 7-7v-15" />
            </g>
            <g transform="translate(222 57)">
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
            <g transform="translate(218 211) rotate(8 16 19)">
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
            <g transform="translate(67 238)">
              <g className="pet-fx-ball">
                <circle r="11" fill={`url(#${id}-ball)`} stroke="#c4a67d" strokeWidth="1" />
                <path d="M-9-6C-2-2 2 3 6 9" stroke="#fff9e8" strokeWidth="4" />
                <path d="M-7 8c4-1 9-6 12-17" stroke="#adc2af" strokeWidth="3" />
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
                  width={i === 1 ? 15 : 11}
                  height={i === 1 ? 15 : 11}
                />
              </g>
            ))}
          </>
        )}
      </svg>
    </div>
  )
}
