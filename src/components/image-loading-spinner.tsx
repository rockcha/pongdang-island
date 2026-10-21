import { LoaderCircle } from 'lucide-react'

export function ImageLoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="이미지를 불러오는 중"
      className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-primary/65 ${className}`}
    >
      <LoaderCircle aria-hidden="true" className="size-5 max-h-full max-w-full shrink-0 animate-spin motion-reduce:animate-none" />
      <span aria-hidden="true" className="whitespace-nowrap text-[10px] leading-tight">로딩 중</span>
    </span>
  )
}
