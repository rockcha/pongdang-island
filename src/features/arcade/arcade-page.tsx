import { GameLoading, GameLoadBoundary } from './game-loading'
import { LandscapeImage } from '@/components/landscape-image'
import { ArrowUpRight, Gamepad2, Gift, CalendarDays } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { arcadeGames, arcadeGamePath, arcadeTagLabels, type ArcadeGame } from './games'
import { GoldIcon } from '@/features/gold/gold-provider'
import { Suspense, useState } from 'react'

function GameRules({ game }: { game: ArcadeGame }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        {game.entryFee === undefined ? (
          '참가비 미정'
        ) : !game.entryFee ? (
          '무료'
        ) : (
          <>
            참가비: <GoldIcon className="size-4" />
            {game.entryFee.toLocaleString('ko-KR')}
          </>
        )}
      </span>
      <span className="inline-flex flex-wrap items-center gap-1">
        {game.tags?.map((tag) => (
          <span key={tag} className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-primary">
            {arcadeTagLabels[tag]}
          </span>
        ))}
      </span>
    </div>
  )
}

export function ArcadePage() {
  const [category, setCategory] = useState<keyof typeof arcadeTagLabels | null>(null)
  const [reward, setReward] = useState<'instant' | 'settlement'>('instant')
  const filters = [
    { id: null, image: '/app-icons/all.png' },
    { id: 'luck', image: '/app-icons/arcade-luck.png' },
    { id: 'brain', image: '/app-icons/arcade-brain.png' },
    { id: 'physical', image: '/app-icons/arcade-physical.png' },
  ] as const
  const games = arcadeGames.filter(
    (game) =>
      (!category || game.tags?.includes(category)) &&
      (game.rewardMode === reward || game.status === 'coming-soon'),
  )
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="오락실 게임 목록">
      <div
        role="group"
        aria-label="게임 분류"
        className="grid shrink-0 grid-cols-4 divide-x border-y bg-background"
      >
        {filters.map(({ id, image }) => (
          <button
            key={id}
            type="button"
            aria-pressed={category === id}
            onClick={() => setCategory((value) => (value === id ? null : id))}
            className={`flex min-h-18 flex-col items-center justify-center gap-1 px-2 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${category === id ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-secondary/40'}`}
          >
            <img src={image} alt="" className="size-9 object-contain" />
            <span className="text-xs">{id === null ? '전체보기' : arcadeTagLabels[id]}</span>
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <div
          role="group"
          aria-label="보상 방식"
          className="grid min-w-0 flex-1 grid-cols-2 rounded-lg bg-secondary/50 p-1"
        >
          {(['instant', 'settlement'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={reward === value}
              onClick={() => setReward(value)}
              className={`flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring ${reward === value ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}
            >
              {value === 'instant' ? (
                <Gift aria-hidden="true" className="size-3.5" />
              ) : (
                <CalendarDays aria-hidden="true" className="size-3.5" />
              )}
              {value === 'instant' ? '즉시 보상' : '주간 보상'}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <ul className="grid grid-cols-2 items-stretch gap-3">
          {games.map((game) => (
            <li
              key={game.id}
              className="group min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card focus-within:ring-2 focus-within:ring-ring"
            >
              <Link to={arcadeGamePath(game.id)} className="flex h-full flex-col outline-none">
                <div className="relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden bg-secondary/50 text-primary">
                  {game.thumbnail ? (
                    <LandscapeImage
                      src={game.thumbnail}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <game.icon className="size-10 opacity-50" />
                  )}
                  {game.status === 'coming-soon' && (
                    <span className="absolute right-2 top-2 rounded bg-background/95 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      준비 중
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <h2 className="min-h-10 break-keep text-sm leading-5">{game.title}</h2>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground">
                    {game.entryFee !== undefined ? (
                      <span className="inline-flex items-center gap-1">
                        {game.entryFee ? (
                          <>
                            참가비: <GoldIcon className="size-3.5" />
                            {game.entryFee.toLocaleString('ko-KR')}
                          </>
                        ) : (
                          '무료'
                        )}
                      </span>
                    ) : (
                      <span>{game.tags?.map((tag) => arcadeTagLabels[tag]).join(' · ')}</span>
                    )}
                    <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {!games.length && (
          <p className="py-12 text-center text-xs text-muted-foreground">
            이 분류의 게임을 준비하고 있어요.
          </p>
        )}
      </div>
    </section>
  )
}

export function ArcadeGamePage() {
  const { gameId } = useParams()
  const game = arcadeGames.find((item) => item.id === gameId)
  const Game = game?.status === 'ready' ? game.component : undefined
  if (game)
    return (
      <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-2">
        {Game ? (
          <GameLoadBoundary key={game.id}>
            <Suspense fallback={<GameLoading />}>
              <div className="flex min-h-0 flex-1 flex-col motion-safe:animate-[game-screen-enter_150ms_ease-out]">
                <Game />
              </div>
            </Suspense>
          </GameLoadBoundary>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
            <game.icon className="size-8 text-primary/60" />
            <p className="text-sm">게임을 준비하고 있어요.</p>
            <GameRules game={game} />
          </div>
        )}
      </section>
    )
  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
      <Gamepad2 className="size-9 text-muted-foreground" />
      <p>게임을 찾을 수 없어요.</p>
    </section>
  )
}
