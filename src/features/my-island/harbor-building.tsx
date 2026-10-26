/** Canonical entrance is at the top; the editor rotates the complete marina. */
export function HarborBuilding() {
  return (
    <g>
      <ellipse cx="48" cy="89" rx="51" ry="10" fill="#376b70" opacity=".16" />
      {/* Open water between the two timber jetties. */}
      <path d="M17 27h62v65H17Z" fill="#8fc6c4" fillOpacity=".45" />
      <path
        d="M26 47q7 3 13 0m19 9q7 3 13 0M23 80q7 3 13 0m22 11q7 3 13 0"
        fill="none"
        stroke="#d7eee0"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M0 3h96v29H80v62H64V32H19v62H3V32H0Z"
        fill="#9b7956"
        stroke="#775f47"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M3 5h90v24H77v62H67V29H16v62H6V29H3Z" fill="#c5a06f" />
      {[9, 16, 23].map((y) => (
        <path key={y} d={`M3 ${y}h90`} stroke="#e5c38c" strokeWidth="1.7" />
      ))}
      {[37, 45, 53, 61, 69, 77, 85].map((y) => (
        <path key={y} d={`M6 ${y}h10m51 0h10`} stroke="#e5c38c" strokeWidth="1.7" />
      ))}
      <path d="M5 31v59m73-59v59" fill="none" stroke="#896d4c" strokeWidth="2" />
      {[
        { x: 3, y: 31 },
        { x: 3, y: 62 },
        { x: 3, y: 90 },
        { x: 80, y: 31 },
        { x: 80, y: 62 },
        { x: 80, y: 90 },
      ].map(({ x, y }, i) => (
        <g key={i}>
          <rect x={x - 2} y={y - 3} width="7" height="8" rx="2" fill="#8e6e4b" />
          <ellipse cx={x + 1.5} cy={y - 3} rx="4" ry="2.5" fill="#e6c68e" />
        </g>
      ))}
      <path
        d="M5 34q-4 12 0 24m0 8q-4 12 0 21m76-53q4 12 0 24m0 8q4 12 0 21"
        stroke="#f1dfb4"
        strokeWidth="1.7"
        fill="none"
      />
      {/* A compact striped lighthouse marks the shore end. */}
      <g transform="translate(8 -18)">
        <ellipse cx="11" cy="44" rx="14" ry="4" fill="#8a8065" opacity=".2" />
        <path d="M5 3h12l5 38H0Z" fill="#fff1d2" stroke="#a59274" strokeWidth="1.3" />
        <path d="M3 18h16l1 8H2Z" fill="#d8917d" />
        <path d="M1 34h20l1 7H0Z" fill="#d8917d" />
        <rect
          x="3"
          y="-8"
          width="16"
          height="13"
          rx="2"
          fill="#f8e7a9"
          stroke="#6f9593"
          strokeWidth="1.5"
        />
        <path d="M11-8V4M1 5h20" stroke="#7c9d92" strokeWidth="1.3" />
        <path d="M-1-8L11-17 23-8Z" fill="#6e9a9c" stroke="#567e83" strokeWidth="1.3" />
        <circle cx="11" cy="-18" r="2" fill="#e7be80" />
        <path d="M8 35v-7q3-5 6 0v7" fill="#799c95" />
      </g>
      {/* Teal-roof harbour office, sign and rescue ring. */}
      <g transform="translate(35 -5)">
        <rect width="36" height="31" rx="4" fill="#f6e6bf" stroke="#b09b76" strokeWidth="1.5" />
        <path d="M-4 2L18-14 40 2v5H-4Z" fill="#76a7a5" stroke="#587f82" strokeWidth="1.5" />
        <path d="M1 1L18-9 35 1" fill="none" stroke="#b9d6be" strokeWidth="1.5" />
        <rect x="5" y="10" width="15" height="13" rx="2" fill="#8cbeb5" />
        <path d="M12 11v11M6 16h13" stroke="#f5edce" strokeWidth="1.3" />
        <rect x="24" y="11" width="8" height="20" rx="2" fill="#829985" />
        <circle cx="29" cy="23" r="1" fill="#f2d28b" />
        <rect x="8" y="0" width="20" height="8" rx="3" fill="#fff0cd" />
        <path
          d="M18 1v5m-4-3q0 5 4 4 4 1 4-4m-6 0h4"
          fill="none"
          stroke="#78948a"
          strokeWidth="1.1"
        />
      </g>
      <circle cx="89" cy="17" r="6" fill="#f7eed3" stroke="#b78c6e" strokeWidth="1" />
      <circle cx="89" cy="17" r="3" fill="#a4b9a4" />
      <path d="M86 12l1 2m5 0-2 1m-4 6 1-2m5 3-2-2" stroke="#de9680" strokeWidth="3" />
      <path d="M85 1v-23" stroke="#88917b" strokeWidth="2" />
      <path d="M86-22h15l-5 5 5 4H86Z" fill="#e5af86" />
      {/* The boat sits between the piers, tied to both sides. */}
      <path d="M17 56l18 5m26 0 6-8" stroke="#e9dcad" strokeWidth="1.4" />
      <ellipse cx="45" cy="82" rx="19" ry="7" fill="#4d9195" opacity=".23" />
      <path
        d="M29 43q15-7 31 0l-4 33q-3 13-12 17-11-6-14-18Z"
        fill="#fff1ce"
        stroke="#9b8666"
        strokeWidth="1.6"
      />
      <path d="M30 48q14-6 29 0l-1 7q-14-6-27 0Z" fill="#d9977c" />
      <path d="M33 76q11 10 21 0l-3 7q-7 8-14-1Z" fill="#d9977c" />
      <rect
        x="34"
        y="53"
        width="21"
        height="23"
        rx="5"
        fill="#78aaa9"
        stroke="#e4e8c2"
        strokeWidth="1.5"
      />
      <rect x="38" y="56" width="13" height="10" rx="2" fill="#c2e0ce" />
      <path d="M45 56v10" stroke="#7aaca6" strokeWidth="1.2" />
      <path d="M44 52V31" stroke="#9d9773" strokeWidth="1.7" />
      <path d="M45 32l11 11H45Z" fill="#f7e9bd" stroke="#c7b48a" strokeWidth=".8" />
      <path d="M40 86h8" stroke="#e5c894" strokeWidth="1.4" />
      {[48, 75].map((y) => (
        <g key={y}>
          <rect
            x="20"
            y={y}
            width="5"
            height="9"
            rx="2.5"
            fill="#fff0d0"
            stroke="#94aa99"
            strokeWidth="1"
          />
          <rect
            x="58"
            y={y}
            width="5"
            height="9"
            rx="2.5"
            fill="#fff0d0"
            stroke="#94aa99"
            strokeWidth="1"
          />
        </g>
      ))}
      <g transform="translate(1 72)">
        <circle cx="10" cy="7" r="6" fill="#d2b280" stroke="#a98a61" strokeWidth="1.2" />
        <circle cx="10" cy="7" r="3" fill="none" stroke="#f4e1b6" strokeWidth="1.5" />
        <path d="M7 10q-5 7 1 10" stroke="#ead6a8" strokeWidth="1.4" fill="none" />
      </g>
    </g>
  )
}
