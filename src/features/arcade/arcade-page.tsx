import {GameLoading,GameLoadBoundary} from './game-loading'
import { LandscapeImage } from '@/components/landscape-image'
import { ArrowUpRight, Gamepad2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { arcadeGames, arcadeGamePath, arcadeTagLabels, type ArcadeGame } from './games'
import { GoldIcon } from '@/features/gold/gold-provider'
import { Suspense } from 'react'

function GameRules({ game }: { game: ArcadeGame }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
    <span className="inline-flex items-center gap-1">{game.entryFee === undefined ? '참가비 미정' : !game.entryFee ? '무료' : <><GoldIcon className="size-4" />{game.entryFee.toLocaleString('ko-KR')}</>}</span>
    <span className="inline-flex flex-wrap items-center gap-1">{game.tags?.map(tag=><span key={tag} className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-primary">{arcadeTagLabels[tag]}</span>)}</span>
  </div>
}

export function ArcadePage() {
  return <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="오락실 게임 목록">

    <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 py-3">{arcadeGames.map(game => <li key={game.id} className="group relative grid grid-cols-[36%_1fr] overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring">
        <div className="relative flex min-h-40 items-center justify-center bg-secondary text-primary">{game.thumbnail?<LandscapeImage src={game.thumbnail} alt="" className="absolute inset-0 size-full object-cover" />:<game.icon className="size-10 opacity-60" />}</div>
        <Link to={arcadeGamePath(game.id)} className="min-w-0 space-y-2.5 p-4 outline-none before:absolute before:inset-0"><div className="flex items-start justify-between gap-2"><h2 className="text-base font-normal">{game.title}</h2><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary" /></div><div className="flex flex-wrap gap-1">{game.status==='coming-soon'&&<span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">준비 중</span>}</div><p className="text-xs leading-5 text-muted-foreground">{game.description}</p><GameRules game={game} /></Link>
    </li>)}</ul>
  </section>
}

export function ArcadeGamePage() {
  const { gameId } = useParams()
  const game = arcadeGames.find(item => item.id === gameId)
  const Game = game?.status === 'ready' ? game.component : undefined
  if(game)return <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-2">{Game?<GameLoadBoundary key={game.id}><Suspense fallback={<GameLoading/>}><div className="flex min-h-0 flex-1 flex-col motion-safe:animate-[game-screen-enter_150ms_ease-out]"><Game /></div></Suspense></GameLoadBoundary>:<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center"><game.icon className="size-8 text-primary/60"/><p className="text-sm">게임을 준비하고 있어요.</p><GameRules game={game}/></div>}</section>
  return <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3"><Gamepad2 className="size-9 text-muted-foreground" /><p>게임을 찾을 수 없어요.</p></section>
}
