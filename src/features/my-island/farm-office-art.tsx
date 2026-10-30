/** A fixed 2 × 2 footprint; upgrades add details without moving neighboring items. */
export function FarmOfficeArt({ level = 1 }: { level?: number }) {
  return (
    <g data-farm-office-level={level} stroke="#79674c" strokeWidth="1.1" strokeLinejoin="round">
      <ellipse cx="32" cy="58" rx="29" ry="4" fill="#6f8358" opacity=".18" stroke="none" />
      <rect x="10" y="23" width="44" height="33" rx="3" fill={level >= 4 ? '#e2d7bc' : '#efdcb6'} />
      <path d="M7 25 32 7 57 25Z" fill={level >= 5 ? '#668d67' : '#83a077'} />
      <path d="M10 25h44M17 22 32 11 47 22" fill="none" stroke="#afbf8b" />
      <rect x="26" y="35" width="13" height="21" rx="3" fill="#b68d61" />
      <circle cx="36" cy="46" r="1" fill="#e8c47f" stroke="none" />
      <rect x="14" y="33" width="8" height="9" rx="2" fill="#b4d6c6" />
      <path d="M18 33v9m-4-5h8" stroke="#fcf1d4" />
      <rect x="24" y="24" width="16" height="7" rx="2" fill="#fff0cc" />
      <path
        d="M32 29v-3m0 1q-5 0-4-3 4 0 4 3m0 0q4-4 5-2-1 3-5 2"
        stroke="#739665"
        fill="#96ae73"
        strokeWidth=".8"
      />
      <path d="M8 56h48" stroke="#a18c62" strokeWidth="2" />
      {level >= 2 && (
        <g>
          <rect x="43" y="43" width="15" height="13" rx="2" fill="#ba9667" />
          <path d="m44 45 12 9m0-9-12 9" stroke="#dbc294" />
          <path d="M48 43v-9m5 9v-7" stroke="#9a8763" strokeWidth="2" />
          <path d="m46 34 3-3 2 3" fill="#b2b99b" />
        </g>
      )}
      {level >= 3 && (
        <g>
          <path d="M10 31h44l4 7H6Z" fill="#f4e4bb" />
          {[10, 22, 34, 46].map((x) => (
            <path key={x} d={`M${x} 31h6l2 7h-8Z`} fill="#91a87d" stroke="none" />
          ))}
          <path d="M9 38v16m46-16v16" stroke="#ac8c60" />
        </g>
      )}
      {level >= 4 && (
        <g fill="#c4bda6">
          <path d="M10 51h14v5H10Zm30 0h14v5H40Z" />
          <path d="M17 51v5m30-5v5" stroke="#e8dfc8" />
        </g>
      )}
      {level >= 5 && (
        <g>
          <path d="M10 26q-7 12 1 25m44-25q6 10-1 16" fill="none" stroke="#78915d" />
          <path d="m8 34-5-3 1 5Zm1 11-5-1 3 4Zm47-12 5-3-1 6Z" fill="#8ba96d" stroke="none" />
          {[9, 54].map((x) => (
            <g key={x}>
              <path d={`M${x - 3} 55h7l-1 5h-5Z`} fill="#cc9a76" />
              <circle cx={x} cy="52" r="4" fill="#e5b5b0" stroke="none" />
              <circle cx={x} cy="52" r="1.4" fill="#f3dc8e" stroke="none" />
            </g>
          ))}
          <path d="m32 5-3-3 3-2 3 2Z" fill="#e7bf64" stroke="#c39745" />
        </g>
      )}
    </g>
  )
}
