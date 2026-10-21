export function NewDiscoveryBadge({ className = '' }: { className?: string }) {
  return (
    <span
      aria-label="첫 발견"
      className={`inline-flex h-5 min-w-9 shrink-0 items-center justify-center rounded-[2px] bg-red-600 px-2 align-middle text-[10px] font-bold leading-none text-white ${className}`}
    >
      NEW
    </span>
  )
}
