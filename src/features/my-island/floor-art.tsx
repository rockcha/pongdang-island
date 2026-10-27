import { useId } from 'react'
export function FloorPatterns({ prefix = 'island-floor' }: { prefix?: string }) {
  return (
    <defs>
      <pattern id={`${prefix}-grass`} width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#b1c994"/><path d="m7 23 2-3 2 3m12-12 2-3 2 3" stroke="#8fac78" strokeWidth="1.1" fill="none" opacity=".65"/></pattern>
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
