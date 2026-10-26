import type { Facility } from './island-model'

function Base({ wide = false }: { wide?: boolean }) {
  return (
    <>
      <ellipse
        cx={wide ? 32 : 16}
        cy="29"
        rx={wide ? 35 : 21}
        ry="6"
        fill="#42654e"
        opacity=".16"
      />
      <rect x="-2" y="23" width={wide ? 68 : 36} height="8" rx="4" fill="#c3b99a" />
      <path d={`M2 26h${wide ? 60 : 28}`} stroke="#e9dfbe" strokeWidth="2" />
    </>
  )
}
export function ActivityLandmark({ facility: f }: { facility: Facility }) {
  if (f.kind === 'title-flag')
    return (
      <g>
        <Base />
        <path d="M7-38v63M0 25h15" stroke="#9b8765" strokeWidth="3" strokeLinecap="round" />
        <circle cx="7" cy="-40" r="3" fill="#edcc84" />
        <path d="M9-35h27v28L22-15 9-7Z" fill="#c1a17b" stroke="#9d8261" strokeWidth="1.3" />
        <path d="M12-32h20v18l-10-5-10 5Z" fill="#98b4a0" />
        <path d="M22-30l3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1Z" fill="#f5db93" />
        <circle cx="23" cy="17" r="8" fill="#f0d08b" stroke="#b59964" strokeWidth="1.5" />
        <path d="M20 11l-3-10 6 3 6-3-3 10" fill="#c28b7c" />
        <path d="M23 13l1.5 2.5 3 .5-2 2 .5 3-3-1.5-2.5 1.5.5-3-2-2 3-.5Z" fill="#fff0bf" />
      </g>
    )
  if (f.kind === 'relic-case')
    return (
      <g>
        <Base />
        <rect x="3" y="12" width="26" height="13" rx="3" fill="#b59977" />
        <path d="M6 15h20M7 23h18" stroke="#e2c99a" strokeWidth="1.5" />
        <path
          d="M1 13V-8q15-25 30 0v21Z"
          fill="#b8dbce"
          fillOpacity=".5"
          stroke="#92b7ad"
          strokeWidth="1.6"
        />
        <path d="M5 10V-7q4-8 10-9" fill="none" stroke="#fff5d6" strokeWidth="2" opacity=".8" />
        <ellipse cx="16" cy="10" rx="10" ry="3" fill="#839c8a" />
        <path d="M16-9l9 8-9 12-9-12Z" fill="#c4accc" stroke="#9c8aaa" strokeWidth="1.2" />
        <path d="M16-9v20M7-1h18" stroke="#e7d8db" strokeWidth="1.2" />
        <circle cx="24" cy="-11" r="2" fill="#f4da98" />
      </g>
    )
  if (f.kind === 'map-table')
    return (
      <g>
        <Base wide />
        <path d="M7 6v23m49-23v23" stroke="#a88a64" strokeWidth="4" />
        <path d="M-2-6h68v22H-2Z" fill="#bb9b6c" stroke="#967b58" strokeWidth="1.4" />
        <path
          d="M3-12l16 4 15-5 15 4 12-3v25l-13 3-14-4-15 4-16-4Z"
          fill="#f2dfab"
          stroke="#c0a77a"
          strokeWidth="1.1"
        />
        <path d="M19-8v24M34-13v25M49-9v25" stroke="#d7bd8b" strokeWidth="1" />
        <path d="M9 0l5 5 9-3 6 5 10-7 13 4" fill="none" stroke="#8eaf9b" strokeWidth="3" />
        <path
          d="M9 8q14 7 26 0t20 0"
          fill="none"
          stroke="#d4a081"
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />
        <circle cx="50" cy="-2" r="5" fill="#fff0c7" stroke="#a5a38a" strokeWidth="1" />
        <path d="M50-6l2 5-5 2Z" fill="#bc8c79" />
      </g>
    )
  if (f.kind === 'notice-board' || f.kind === 'community-board') {
    const notice = f.kind === 'notice-board'
    return (
      <g>
        <Base wide />
        <path d="M10-5v34m44-34v34" stroke="#a58b66" strokeWidth="4" />
        <rect
          x="0"
          y="-29"
          width="64"
          height="48"
          rx="4"
          fill={notice ? '#8eaa95' : '#b99b74'}
          stroke="#957d5c"
          strokeWidth="2"
        />
        <path
          d="M-4-30l36-14 36 14v5H-4Z"
          fill={notice ? '#acc1a6' : '#c9ae82'}
          stroke="#927f60"
          strokeWidth="1.5"
        />
        {[
          { x: 7, y: -19, w: 19, h: 26 },
          { x: 31, y: -17, w: 24, h: 15 },
          { x: 34, y: 2, w: 17, h: 10 },
        ].map((p, i) => (
          <g key={i}>
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx="1"
              fill={i === 1 ? '#e5d8ba' : '#fff0cd'}
            />
            <circle cx={p.x + p.w / 2} cy={p.y + 2} r="1.6" fill={i % 2 ? '#a5b5a2' : '#d5a28b'} />
            <path
              d={`M${p.x + 4} ${p.y + 8}h${p.w - 8}m-${p.w - 8} 4h${p.w - 10}`}
              stroke="#bdb294"
              strokeWidth="1"
            />
          </g>
        ))}
        {notice && <path d="M27-37v-9m-4 2 4-3 4 3" stroke="#d3b77c" strokeWidth="2" fill="none" />}
      </g>
    )
  }
  if (f.kind === 'gramophone')
    return (
      <g>
        <Base />
        <rect
          x="1"
          y="7"
          width="31"
          height="20"
          rx="4"
          fill="#ae8c69"
          stroke="#8e7558"
          strokeWidth="1.2"
        />
        <path d="M5 12h23M6 23h21" stroke="#d8b685" strokeWidth="1.4" />
        <ellipse cx="16" cy="7" rx="12" ry="4" fill="#7c8b7b" />
        <ellipse cx="16" cy="7" rx="5" ry="2" fill="#dec794" />
        <path d="M24 6q11-15-1-21" fill="none" stroke="#bba06a" strokeWidth="3" />
        <path
          d="M23-15Q10-14 5-26L21-37q1 15 10 16Z"
          fill="#d6b87b"
          stroke="#af945f"
          strokeWidth="1.4"
        />
        <ellipse
          cx="12"
          cy="-31"
          rx="11"
          ry="7"
          transform="rotate(-35 12 -31)"
          fill="#f0d89b"
          stroke="#bda16b"
          strokeWidth="1.4"
        />
        <ellipse cx="12" cy="-31" rx="6" ry="3.5" transform="rotate(-35 12 -31)" fill="#a59166" />
        <path d="M31 16h6v6" stroke="#b89c6c" strokeWidth="2" fill="none" />
        <circle cx="36" cy="23" r="2" fill="#d6bc85" />
        <path d="M-6-7v-9l7-2v9m-7-7 7-2" stroke="#91aa98" strokeWidth="1.4" fill="none" />
        <circle cx="-8" cy="-6" r="2.5" fill="#91aa98" />
      </g>
    )
  if (f.kind === 'shell-safe')
    return (
      <g>
        <Base />
        <rect
          x="-1"
          y="-4"
          width="34"
          height="30"
          rx="7"
          fill="#a4b6ad"
          stroke="#7e978b"
          strokeWidth="1.5"
        />
        <rect
          x="3"
          y="0"
          width="26"
          height="22"
          rx="5"
          fill="#c1ccc0"
          stroke="#e3dfc4"
          strokeWidth="1.2"
        />
        <path
          d="M6 11Q-3-7 6-16q7-8 10-3 5-6 11 1 10 9-1 29Z"
          fill="#e7cbb2"
          stroke="#bba88d"
          strokeWidth="1.4"
        />
        <path
          d="M16 10L6-13m10 23L12-18m4 28 5-28m-5 28 12-22"
          stroke="#f9e5c5"
          strokeWidth="1.5"
        />
        <rect
          x="10"
          y="9"
          width="13"
          height="7"
          rx="3"
          fill="#d9b773"
          stroke="#af9360"
          strokeWidth="1"
        />
        <circle cx="17" cy="12" r="1.7" fill="#8b8467" />
        <path d="M17 13v2" stroke="#8b8467" strokeWidth="1.5" />
        <path d="M2 25v5m29-5v5" stroke="#8e9e88" strokeWidth="3" />
        <path d="M5-27h10" stroke="#d1ad69" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    )
  if (f.kind === 'arcade-cabinet')
    return (
      <g>
        <ellipse cx="32" cy="62" rx="36" ry="8" fill="#42654e" opacity=".17" />
        <path d="M5 5h54l-4 57H9Z" fill="#739c9d" stroke="#577d82" strokeWidth="2" />
        <path d="M7-12h50l6 17H1Z" fill="#9ebbb0" stroke="#6e9290" strokeWidth="1.5" />
        <rect x="10" y="-9" width="44" height="11" rx="4" fill="#f6df9f" />
        <path
          d="M20-6l2 3 3-3 3 3 3-3m7 0v5m-2-2h4"
          stroke="#b68e6b"
          strokeWidth="1.5"
          fill="none"
        />
        <rect x="11" y="8" width="42" height="27" rx="4" fill="#e1dfc2" />
        <rect x="15" y="12" width="34" height="19" rx="2" fill="#566e76" />
        <path d="M22 24l6-8 6 8 7-5" stroke="#d9c78e" strokeWidth="2" fill="none" />
        <circle cx="42" cy="16" r="2" fill="#c2cfaa" />
        <path d="M5 35h54l4 10H1Z" fill="#afc0ac" stroke="#708f86" strokeWidth="1.3" />
        <path d="M18 40v-7" stroke="#78846e" strokeWidth="2" />
        <circle cx="18" cy="32" r="3" fill="#dc9a80" />
        <circle cx="42" cy="40" r="3" fill="#e4bd7d" />
        <circle cx="51" cy="39" r="2.5" fill="#d2927d" />
        <rect x="23" y="48" width="18" height="8" rx="2" fill="#5c7e7c" />
        <path d="M29 51h7" stroke="#c3cead" strokeWidth="1.4" />
      </g>
    )
  return null
}
