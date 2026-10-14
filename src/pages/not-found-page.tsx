import { BrandMascot } from '@/components/brand-mascot'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 py-12 text-center">
      <BrandMascot className="h-36 w-36 object-contain" />
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-bold">길을 조금 벗어났어요</h1>
      <p className="text-sm text-muted-foreground">찾으시는 페이지가 없어요. 퐁당섬으로 돌아갈까요?</p>
      <Link to="/" className={buttonVariants({ className: 'min-h-12 rounded-xl px-6' })}>홈으로 돌아가기</Link>
    </section>
  )
}
