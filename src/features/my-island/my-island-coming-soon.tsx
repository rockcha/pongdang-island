import { Link } from 'react-router'
import { ArrowLeft, Hammer } from 'lucide-react'
import { appArt } from '@/components/app-art'
import { lazy, Suspense } from 'react'
import { useOperator } from '@/features/notices/use-operator'

const OperatorIsland = lazy(() => import('./my-island-page').then(module => ({ default: module.MyIslandPage })))
const loadingIsland = <p role="status" className="p-8 text-center text-xs text-muted-foreground">섬을 준비하고 있어요…</p>

export function MyIslandPage() {
  const { operator, loading } = useOperator()
  if (loading) return loadingIsland
  if (operator) return <Suspense fallback={loadingIsland}><OperatorIsland /></Suspense>
  return (
    <section
      className="flex min-h-dvh flex-col bg-background px-6 text-foreground"
      aria-labelledby="island-coming-soon-title"
    >
      <Link
        to="/aquarium"
        className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-3 text-sm text-muted-foreground"
      >
        <ArrowLeft size={18} />내 어항으로
      </Link>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-20 text-center">
        <div className="relative grid size-32 place-items-center rounded-[2rem] bg-secondary">
          <appArt.island className="size-24" />
          <span className="absolute -bottom-2 -right-2 grid size-10 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground">
            <Hammer size={18} />
          </span>
        </div>
        <div className="space-y-3">
          <p className="text-xs tracking-widest text-muted-foreground">나의 퐁당섬</p>
          <h1 id="island-coming-soon-title" className="text-2xl font-semibold">
            준비 중이에요
          </h1>
          <p className="text-sm leading-7 text-muted-foreground">
            나만의 섬을 꾸밀 공간을 다듬고 있어요.
            <br />
            조금 더 준비해서 찾아올게요.
          </p>
        </div>
        <Link
          to="/aquarium"
          className="mt-2 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-7 text-sm font-medium text-primary-foreground"
        >
          내 어항으로 돌아가기
        </Link>
      </div>
    </section>
  )
}
