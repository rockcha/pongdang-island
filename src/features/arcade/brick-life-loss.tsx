import { Heart } from 'lucide-react'

export function BrickLifeLoss({ sequence }: { sequence: number }) {
  return (
    <div
      key={sequence}
      role="status"
      aria-label="생명 1개 감소"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      <span
        aria-hidden="true"
        className="brick-life-loss flex items-center gap-2 text-[#ffb8a9] drop-shadow-[0_3px_8px_#14252b]"
      >
        <span className="text-5xl font-semibold">−</span>
        <Heart className="size-12 fill-current stroke-[#fff0e5]" />
      </span>
    </div>
  )
}
