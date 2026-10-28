import { useId } from 'react'
export function FloorPatterns({ prefix = 'island-floor' }: { prefix?: string }) {
  return (
    <defs>
      <pattern id={`${prefix}-grass`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#b1c994" />
        <path
          d="m7 23 2-3 2 3m12-12 2-3 2 3"
          stroke="#8fac78"
          strokeWidth="1.1"
          fill="none"
          opacity=".65"
        />
      </pattern>
      <pattern id={`${prefix}-dirt`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#d2b78b" />
        <path d="M4 9h3m11 14h4m3-18h2M5 28h2" stroke="#b59b74" strokeWidth="1.3" opacity=".55" />
        <circle cx="12" cy="16" r="1" fill="#ead1a8" />
        <circle cx="27" cy="12" r="1.4" fill="#e5cba0" />
      </pattern>
      <pattern id={`${prefix}-gravel`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#c6c1ae" />
        {[
          { x: 5, y: 7, w: 7, h: 4 },
          { x: 21, y: 4, w: 6, h: 4 },
          { x: 12, y: 17, w: 8, h: 5 },
          { x: 27, y: 22, w: 5, h: 4 },
          { x: 3, y: 27, w: 7, h: 4 },
        ].map((p, i) => (
          <ellipse
            key={i}
            cx={p.x}
            cy={p.y}
            rx={p.w / 2}
            ry={p.h / 2}
            fill={i % 2 ? '#e3ddc6' : '#a9ad9d'}
            stroke="#b2b19f"
            strokeWidth=".6"
          />
        ))}
      </pattern>
      <pattern id={`${prefix}-sand`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#eed6a0" />
        <path
          d="M3 8q6-3 12 0m1 15q6-3 12 0"
          fill="none"
          stroke="#d4bd8b"
          strokeWidth="1"
          opacity=".65"
        />
        <circle cx="24" cy="9" r=".8" fill="#c8b086" />
        <circle cx="8" cy="25" r="1" fill="#fff0c6" />
      </pattern>
      <pattern id={`${prefix}-stone`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#9fa99b" />
        <path
          d="M3 2h17l3 8-4 9H2Zm22 10h7v18H18l1-10ZM1 22h14v10H1ZM24 0h8v8h-8Z"
          fill="#c7cbb7"
          stroke="#e1dfc9"
          strokeWidth="1.1"
        />
      </pattern>
      <pattern id={`${prefix}-brick`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#e5c6a5" />
        <path
          d="M1 1h29v13H1ZM-14 17h28v13h-28Zm32 0h28v13H18Z"
          fill="#c58e75"
          stroke="#ead2ad"
          strokeWidth="1"
        />
        <path d="M4 4h22M20 20h10M1 20h10" stroke="#dfa98b" strokeWidth="1" />
      </pattern>
      <pattern id={`${prefix}-wood`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#b88e61" />
        <path d="M0 1h32M0 12h32M0 23h32" stroke="#e7c18d" strokeWidth="1.4" />
        <path d="M5 5h17m-9 12h16M2 28h17" stroke="#9f7b55" strokeWidth="1" />
        <path d="M3 1v11m19 0v11M8 23v9" stroke="#8e7150" strokeWidth="1" />
      </pattern>
      <pattern id={`${prefix}-moonstone`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#8293ae" />
        <path
          d="M2 2h16l3 10-7 7H2Zm21 0h9v14l-8-2ZM18 20l7-4 7 4v12H17ZM1 22h12l1 10H1Z"
          fill="#b3c1d1"
          stroke="#d6dedb"
          strokeWidth="1"
        />
        <path d="M6 5h8m6 20h7" stroke="#e1e7dd" strokeWidth=".8" />
        <path d="M27 5a4 4 0 1 0 1 7 4 4 0 0 1-1-7Z" fill="#f0e9c6" />
        <circle cx="8" cy="27" r=".7" fill="#f6e7bb" />
      </pattern>
      <pattern id={`${prefix}-star-mosaic`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#b8c6d2" />
        <path
          d="M0 0h32v32H0ZM16 0v7m0 18v7M0 16h7m18 0h7"
          fill="none"
          stroke="#e9e6d0"
          strokeWidth="1.3"
        />
        <path
          d="m16 5 3.4 7 7.6 1-5.5 5.5 1.3 7.5-6.8-3.7L9.2 26l1.3-7.5L5 13l7.6-1Z"
          fill="#e4ce98"
          stroke="#f4e6bb"
          strokeWidth="1"
        />
        <path
          d="m16 9 1.8 6 5.6-.3-5 3 1.2 5-3.6-4-3.6 4 1.2-5-5-3 5.6.3Z"
          fill="#d2b47f"
          opacity=".55"
        />
        {[4, 28].flatMap((x) =>
          [4, 28].map((y) => (
            <path key={`${x}-${y}`} d={`m${x} ${y - 2} 2 2-2 2-2-2Z`} fill="#89aaa9" />
          )),
        )}
      </pattern>
      <pattern id={`${prefix}-teal-glass`} width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#e3e7cf" />
        {[
          { x: 1, y: 1, c: '#91bdb6' },
          { x: 17, y: 1, c: '#acd0c3' },
          { x: 1, y: 17, c: '#a0c8c2' },
          { x: 17, y: 17, c: '#87b5b1' },
        ].map((t) => (
          <g key={t.x + ',' + t.y}>
            <rect x={t.x} y={t.y} width="14" height="14" rx="1" fill={t.c} />
            <path
              d={`M${t.x + 2} ${t.y + 11}l9-9m-9 4 3-3`}
              stroke="#e5f1dd"
              strokeWidth="1.2"
              opacity=".65"
            />
            <path d={`M${t.x + 2} ${t.y + 13}h10`} stroke="#709e9e" strokeWidth=".6" opacity=".5" />
          </g>
        ))}
      </pattern>
      <pattern id={`${prefix}-shell-mosaic`} width="64" height="64" patternUnits="userSpaceOnUse">
        <rect width="64" height="64" fill="#e5d8bb" />
        <path d="M0 0h64v64H0ZM32 0v64M0 32h64" fill="none" stroke="#f8edce" strokeWidth="1.4" />
        <path
          d="M32 49C22 45 5 33 10 22q1-7 8-6 3-9 10-5 4-7 9 0 8-4 11 5 7-1 7 6 5 12-23 27Z"
          fill="#dbbdb0"
          stroke="#f6e5c8"
          strokeWidth="1.5"
        />
        <path
          d="M32 46 17 20m15 26L25 15m7 31V13m0 33 7-31m-7 31 15-26m-15 26 20-17M32 46 12 29"
          fill="none"
          stroke="#f3dcc1"
          strokeWidth="1.6"
        />
        <path d="m27 48 5-4 5 4-2 5h-6Z" fill="#ebcead" stroke="#f8e7c7" strokeWidth="1" />
        {[
          [7, 7],
          [57, 7],
          [7, 57],
          [57, 57],
        ].map(([x, y]) => (
          <path
            key={x + ',' + y}
            d={`m${x} ${y - 3} 3 3-3 3-3-3Z`}
            fill="#a8c3b7"
            stroke="#f5e7c9"
            strokeWidth=".7"
          />
        ))}
      </pattern>
    </defs>
  )
}
export function FloorSwatch({ type }: { type: string }) {
  const prefix = 'floor-preview-' + useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <FloorPatterns prefix={prefix} />
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="9"
        fill={`url(#${prefix}-${type})`}
        stroke="#fff6dd"
        strokeWidth="2"
      />
    </svg>
  )
}
