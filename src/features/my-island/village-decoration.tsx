import type { Facility } from './island-model'
const edge = '#947e64'
function Blossom({
  x,
  y,
  color = '#e7b6bc',
  size = 2.5,
}: {
  x: number
  y: number
  color?: string
  size?: number
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M0 2v7m0-1q-8-6-6-1 2 3 6 1m0-3q7-5 6 0-2 3-6 0"
        fill="#8ea879"
        stroke="#8ea879"
        strokeWidth=".6"
      />
      {[
        [0, -size],
        [size, 0],
        [0, size],
        [-size, 0],
      ].map(([dx, dy], i) => (
        <circle key={i} cx={dx} cy={dy} r={size} fill={color} stroke="#fff1d4" strokeWidth=".45" />
      ))}
      <circle r={size * 0.48} fill="#e9ce84" />
    </g>
  )
}
function Butterfly({
  x,
  y,
  color,
  turn = 0,
}: {
  x: number
  y: number
  color: string
  turn?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <path
        d="M0 0C-10-12-12 3-3 3c-7 5 0 10 3 1C3 12 10 7 3 3c10-1 8-15-3-3Z"
        fill={color}
        stroke="#fff0d9"
        strokeWidth=".8"
      />
      <path
        d="M0-2v7m0-6-2-4m2 4 2-4"
        fill="none"
        stroke="#9a886b"
        strokeWidth=".8"
        strokeLinecap="round"
      />
      <circle cx="-6" cy="0" r="1.2" fill="#fff1cb" />
      <circle cx="6" cy="0" r="1.2" fill="#fff1cb" />
    </g>
  )
}
export function VillageDecoration({ f }: { f: Facility }) {
  const w = f.w * 32,
    h = f.h * 32,
    shadow = <ellipse cx={w / 2} cy={h - 1} rx={w * 0.45} ry="3" fill="#6e876d" opacity=".16" />
  if (f.kind === 'bread-display')
    return (
      <g data-village={f.kind}>
        {shadow}
        <path d="M8 24v7m48-7v7" stroke="#a68b63" strokeWidth="3" />
        <rect
          x="4"
          y="-17"
          width="56"
          height="43"
          rx="3"
          fill="#cca978"
          stroke={edge}
          strokeWidth=".9"
        />
        <rect
          x="7"
          y="-13"
          width="50"
          height="33"
          rx="2"
          fill="#edf1d8"
          stroke="#a99876"
          strokeWidth=".7"
        />
        <path d="M7 3h50M32-13v33" stroke="#c9b286" strokeWidth="2" />
        <path d="m6-16 6-12h40l6 12Z" fill="#f2d6b7" stroke="#bda27c" strokeWidth=".8" />
        {[13, 27, 41].map((x) => (
          <path key={x} d={`M${x}-28h7l3 12h-9Z`} fill="#c58f80" />
        ))}
        <path
          d="M6-16v5q4 4 8 0 4 4 8 0 5 4 10 0 5 4 10 0 4 4 8 0 4 4 8 0v-5Z"
          fill="#f2dcbb"
          stroke="#c0a482"
          strokeWidth=".6"
        />
        <path d="M14 0q-5-5 2-9l9-2q7 3 3 9Z" fill="#d9ac65" stroke="#b59158" strokeWidth=".7" />
        <path d="m17-8 2 4m3-5 2 4" stroke="#f5d89c" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="44" cy="-4" rx="8" ry="4.5" fill="#e3be7b" stroke="#bc9b67" strokeWidth=".7" />
        <path d="m41-7 4 5m0-6 4 5" stroke="#f9e1ab" strokeWidth="1.2" />
        <path
          d="M12 15q-3-7 3-9 3 0 5 4 2-4 5-3 6 5 0 9Z"
          fill="#dcb180"
          stroke="#b69265"
          strokeWidth=".7"
        />
        {[39, 47].map((x, i) => (
          <g key={x}>
            <path
              d={`M${x - 4} 16v-6q4-5 8 0v6Z`}
              fill={i ? '#d4a772' : '#e8c88e'}
              stroke="#bc996c"
              strokeWidth=".6"
            />
            <path d={`M${x - 2} 11h4`} stroke="#f5dfb5" strokeWidth="1" />
          </g>
        ))}
        <path d="M9-12v29m3-24v13" stroke="#fffdf0" strokeWidth="1.4" opacity=".65" />
        <rect x="22" y="23" width="20" height="5" rx="1" fill="#eee0bc" />
        <path d="M27 25h10" stroke="#b8a17c" strokeWidth=".7" />
      </g>
    )
  if (f.kind === 'mailbox-planter')
    return (
      <g data-village={f.kind}>
        {shadow}
        <path d="M17-9v32" stroke="#b49b75" strokeWidth="4" />
        <rect
          x="5"
          y="-23"
          width="25"
          height="17"
          rx="6"
          fill="#9ebbaa"
          stroke={edge}
          strokeWidth=".85"
        />
        <path d="M22-23q-6 2-5 8v9" fill="none" stroke="#d5dfc4" strokeWidth="1" />
        <rect x="8" y="-17" width="8" height="6" rx="1" fill="#f2e3bc" />
        <path d="m8-17 4 3 4-3" fill="none" stroke="#b7a584" strokeWidth=".65" />
        <path d="M27-12v-17h6v5h-6" fill="#d69b91" stroke="#a88b74" strokeWidth=".7" />
        <path d="M2 20h29l-3 10H5Z" fill="#d6b08f" stroke="#b99b7b" strokeWidth=".8" />
        <ellipse cx="16" cy="20" rx="14" ry="3" fill="#9b9979" />
        <Blossom x={7} y={12} color="#e8c59d" />
        <Blossom x={14} y={9} color="#d9acbd" />
        <Blossom x={24} y={12} color="#e9dba9" />
        <path d="M7 25h18" stroke="#eed2ac" strokeWidth="1" />
      </g>
    )
  if (f.kind === 'flower-bicycle')
    return (
      <g data-village={f.kind}>
        {shadow}
        {[14, 49].map((x) => (
          <g key={x}>
            <circle cx={x} cy="22" r="10" fill="#ece8d1" stroke="#8e9d96" strokeWidth="2" />
            <circle cx={x} cy="22" r="7.5" fill="none" stroke="#c7cbbc" strokeWidth=".7" />
            <path
              d={`M${x - 6} 16l12 12m0-12-12 12m6-14v16m-8-8h16`}
              stroke="#bdc5b6"
              strokeWidth=".5"
            />
          </g>
        ))}
        <path
          d="m14 22 10-17 13 17H14m10-17 3 17L44 9m-7 13 7-19 6 19"
          fill="none"
          stroke="#c7928c"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M19 4h10m15-2h8l2 3"
          fill="none"
          stroke="#8d8973"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="m27 22 5 4m-8 0h4" fill="none" stroke="#a69276" strokeWidth="1.2" />
        <path d="M41-8h19l-3 13H44Z" fill="#cfaf7d" stroke="#a88f68" strokeWidth=".8" />
        <path d="M44-4h13m-12 4h11m-9-7v10m6-10v10" stroke="#ead4a4" strokeWidth=".75" />
        <Blossom x={46} y={-13} color="#ead1b7" size={2} />
        <Blossom x={53} y={-15} color="#d4b1c4" size={2} />
        <path d="M10 9h8" stroke="#e7c4ae" strokeWidth="1.2" />
      </g>
    )
  if (f.kind === 'pastel-surfboard')
    return (
      <g data-village={f.kind}>
        {shadow}
        <path
          d="M6 56h21m-18-8v14m15-14v14"
          fill="none"
          stroke="#b49a75"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g transform="rotate(-8 16 22)">
          <path
            d="M16-29C3-18 3 17 8 43q7 14 16 0 7-28-8-72Z"
            fill="#a7ccc5"
            stroke="#8aa99d"
            strokeWidth="1"
          />
          <path d="M16-28c-4 19-4 54-1 77q4 1 6-4 2-42-5-73Z" fill="#f4e5be" />
          <path d="M7 19q8-8 18-1m-17 5q7-6 16-1" fill="none" stroke="#d3a0a0" strokeWidth="3" />
          <path d="M12-15q-5 22-2 37" fill="none" stroke="#e4eee0" strokeWidth="1.2" />
          <path d="m13 38 3-6 4 6-4 4Z" fill="#d5ae8a" />
        </g>
      </g>
    )
  if (f.kind === 'butterfly-flowerbed')
    return (
      <g data-village={f.kind}>
        {shadow}
        <rect
          x="2"
          y="14"
          width="60"
          height="16"
          rx="6"
          fill="#c9b395"
          stroke="#a9997c"
          strokeWidth=".8"
        />
        <ellipse cx="32" cy="16" rx="29" ry="8" fill="#8ca477" />
        {[
          [9, 9],
          [20, 5],
          [31, 11],
          [42, 5],
          [54, 10],
        ].map(([x, y], i) => (
          <Blossom key={x} x={x} y={y} color={['#e3bbca', '#e8d8a4', '#bdb3d0'][i % 3]} size={3} />
        ))}
        <Butterfly x={15} y={-8} color="#d9bd92" turn={-14} />
        <Butterfly x={44} y={-10} color="#b8afd3" turn={16} />
        <path d="M8 25h48" stroke="#e4d0ae" strokeWidth="1" />
      </g>
    )
  if (f.kind === 'fish-fountain')
    return (
      <g data-village={f.kind}>
        {shadow}
        <ellipse cx="32" cy="51" rx="30" ry="12" fill="#b3b8a3" />
        <ellipse cx="32" cy="47" rx="30" ry="12" fill="#e1d6bd" stroke="#b7b298" strokeWidth="1" />
        <ellipse cx="32" cy="46" rx="25" ry="8" fill="#a1ccc6" />
        <ellipse
          className="island-fountain-ripple"
          cx="32"
          cy="46"
          rx="19"
          ry="5"
          fill="none"
          stroke="#e5f1dc"
          strokeWidth=".9"
        />
        <path d="M24 42h16l-3-20H27Z" fill="#c5c4a9" stroke="#a4ab95" strokeWidth=".8" />
        <ellipse cx="32" cy="42" rx="10" ry="3" fill="#dad3b7" />
        <path d="m41 11 14-10-2 18 3 7-15-8Z" fill="#a3b9a4" stroke="#8ea18d" strokeWidth=".8" />
        <ellipse cx="29" cy="13" rx="16" ry="11" fill="#b7cbb4" stroke="#8fa28d" strokeWidth=".9" />
        <path d="m25 3 7-8 6 9m-11 17 8 6 5-7" fill="#9db7a5" stroke="#8ca390" strokeWidth=".7" />
        <path d="M36 9q-5 4 0 8m4-6q-4 3 0 6" fill="none" stroke="#95af99" strokeWidth=".8" />
        <circle cx="20" cy="10" r="1.8" fill="#788a78" />
        <circle cx="19.5" cy="9.5" r=".5" fill="#fff0cd" />
        <path d="M15 16q3 2 5 0" fill="none" stroke="#8da18b" strokeWidth=".7" />
        <path
          className="island-fountain-stream"
          d="M14 14Q-1-5 7 43M14 15Q5 4 12 42"
          fill="none"
          stroke="#d7ede3"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M5 44h6m-3-3v5" stroke="#eef5e2" strokeWidth="1" />
      </g>
    )
  if (f.kind === 'droplet-lamp')
    return (
      <g data-village={f.kind}>
        {shadow}
        <ellipse cx="17" cy="-4" rx="14" ry="18" fill="#fff0b8" opacity=".16" />
        <path
          d="M17 26v-53q1-6 6-5"
          fill="none"
          stroke="#91a6a1"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M13 28h9l2 3H10Z" fill="#b0b7a1" stroke="#929e8c" strokeWidth=".7" />
        <path
          d="M17-25C13-17 5-12 7-3 9 9 26 9 27-3c1-8-6-13-10-22Z"
          fill="#b4d5cb"
          stroke="#8ba9a2"
          strokeWidth=".9"
        />
        <path d="M17-17C15-12 12-9 12-4c0 7 11 8 11 0 0-5-4-8-6-13Z" fill="#f3e3ac" />
        <path
          d="M12-12q-7 14 2 17"
          fill="none"
          stroke="#ecf1d9"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path d="M13-24h8l2-4H11Z" fill="#a6bdb1" stroke="#8ca398" strokeWidth=".6" />
        <circle cx="17" cy="-29" r="2" fill="#d7c598" />
      </g>
    )
  return (
    <g data-village="coral-planter">
      {shadow}
      <path d="M7 18h20l-3 12H10Z" fill="#d7b096" stroke="#b4957c" strokeWidth=".8" />
      <ellipse cx="17" cy="18" rx="11" ry="3" fill="#9c9d83" />
      <path
        d="M16 18V-13m0 12-7-5v-7m7 18 8-6v-10m-15 6-5-6m20 4 5-6"
        fill="none"
        stroke="#dcaeaa"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 18V4L6 0m15 18V7l6-4"
        fill="none"
        stroke="#c8bdcf"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path d="M17 17q-8-6-8-1 2 5 8 1m0 0q6-8 9-3 1 5-9 3" fill="#9bbeb0" />
      <path d="M12 23h10m-9 3h8" stroke="#eed4b6" strokeWidth=".8" />
      <path d="m17 22 2 2-2 2-2-2Z" fill="#f4e2c3" />
    </g>
  )
}
