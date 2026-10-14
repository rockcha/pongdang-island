export function BrandMascot({ className, decorative = false, priority = false }: { className?: string; decorative?: boolean; priority?: boolean }) {
  return <img src="/branding/pongi.png" alt={decorative ? '' : '퐁당섬 마스코트 해달 퐁이'} width={1280} height={1280} className={className} fetchPriority={priority ? 'high' : undefined} />
}
