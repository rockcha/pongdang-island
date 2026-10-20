export function NewDiscoveryBadge({ className = '' }: { className?: string }) {
  return (
    <span
      aria-label="첫 발견"
      className={`inline-flex w-fit shrink-0 px-1 py-1 text-[11px] font-bold leading-none tracking-[0.16em] text-rose-600 [text-shadow:0_0_10px_#fb718566] dark:text-rose-400 motion-safe:animate-in motion-safe:fade-in ${className}`}
    >
      NEW
    </span>
  )
}
