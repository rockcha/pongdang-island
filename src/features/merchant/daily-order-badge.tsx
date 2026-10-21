export function DailyOrderBadge() {
  return (
    <span className="inline-flex shrink-0 items-center" role="img" aria-label="오늘의 의뢰 품목" title="오늘의 의뢰 품목">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-6 drop-shadow-sm" fill="none">
        <path d="M8 5h16a2 2 0 0 1 2 2v21l-4-2-3 2-3-2-3 2-3-2-4 2V7a2 2 0 0 1 2-2Z" fill="#FFF3D6" stroke="#9A6028" strokeWidth="1.8" strokeLinejoin="round" />
        <rect x="12" y="3" width="10" height="5" rx="2" fill="#F6B94B" stroke="#9A6028" strokeWidth="1.5" />
        <path d="m11 16 3 3 7-7M11 23h10" stroke="#248C83" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
