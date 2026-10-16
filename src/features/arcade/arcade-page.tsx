import { ArrowUpRight, Gamepad2, Ticket, CalendarDays } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { arcadeGames, arcadeGamePath, arcadeTagLabels, type ArcadeGame } from './games'
import { GoldIcon } from '@/features/gold/gold-provider'
import { Suspense } from 'react'

function GameRules({ game }: { game: ArcadeGame }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
    <span className="inline-flex items-center gap-1"><Ticket className="size-3.5" />{game.entryFee === undefined ? '참가비 미정' : !game.entryFee ? '무료' : <><GoldIcon className="size-4" />{game.entryFee.toLocaleString('ko-KR')}</>}</span>
    <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{game.dailyLimit === undefined ? '참가 횟수 미정' : game.dailyLimit === null ? '횟수 제한 없음' : `하루 ${game.dailyLimit}회`}</span>
  </div>
}

export function ArcadePage() {
  return <section className="space-y-4 py-5" aria-label="오락실 게임 목록">
    <p className="text-sm text-muted-foreground">잠깐 쉬어가며 즐기는 섬의 작은 놀이들</p>
    <ul className="space-y-3">{arcadeGames.map(game => <li key={game.id}>
      <Link to={arcadeGamePath(game.id)} className="group grid grid-cols-[36%_1fr] overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="relative flex min-h-40 items-center justify-center bg-secondary text-primary">{game.thumbnail?<img src={game.thumbnail} alt="" className="absolute inset-0 size-full object-cover" />:<game.icon className="size-10 opacity-60" />}</div>
        <div className="min-w-0 space-y-2.5 p-4"><div className="flex items-start justify-between gap-2"><h2 className="text-base font-normal">{game.title}</h2><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary" /></div><div className="flex flex-wrap gap-1">{game.tags?.map(tag=><span key={tag} className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-primary">{arcadeTagLabels[tag]}</span>)}{game.status==='coming-soon'&&<span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">준비 중</span>}</div><p className="text-xs leading-5 text-muted-foreground">{game.description}</p><GameRules game={game} /></div>
      </Link>
    </li>)}</ul>
  </section>
}

export function ArcadeGamePage() {
  const { gameId } = useParams()
  const game = arcadeGames.find(item => item.id === gameId)
  const Game = game?.status === 'ready' ? game.component : undefined
  if(game)return <section className="flex min-h-0 flex-1 flex-col gap-2 py-2">{Game?<Suspense fallback={<p role="status">게임 준비 중…</p>}><Game /></Suspense>:<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center"><game.icon className="size-8 text-primary/60"/><p className="text-sm">게임을 준비하고 있어요.</p><GameRules game={game}/></div>}</section>
  return <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3"><Gamepad2 className="size-9 text-muted-foreground" /><p>게임을 찾을 수 없어요.</p></section>
}
