import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { TankInhabitants } from '@/features/aquarium/tank-inhabitants'
import { TankBubbles } from '@/features/aquarium/tank-bubbles'
import { backgroundUrl } from '@/features/aquarium/api'
import { loadFriendAquarium, visitError } from './aquarium-api'
import type { FriendAquarium } from './aquarium-api'
import { AquariumCare } from './aquarium-care'
import { FriendAquariumPicker } from './friend-aquarium-picker'

export function FriendAquariumPage() {
  const { ownerId } = useParams()
  return <Visit key={ownerId} owner={ownerId ?? ''} />
}
function Visit({ owner }: { owner: string }) {
  const [data, setData] = useState<FriendAquarium | null>(null),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0),
    [index, setIndex] = useState(0)
  useEffect(() => {
    let active = true
    loadFriendAquarium(owner)
      .then((value) => {
        if (active) {
          setData(value)
          setError('')
        }
      })
      .catch((cause) => {
        if (active) setError(visitError(cause))
      })
    return () => {
      active = false
    }
  }, [owner, attempt])
  const tank = data?.tanks[index]
  const items = useMemo(
    () =>
      data?.inhabitants
        .filter((item) => item.tank_id === tank?.id)
        .map((item) => ({ ...item, interaction_locked: true })) ?? [],
    [data, tank?.id],
  )
  const background = data?.backgrounds.find((b) => b.id === tank?.background_id)
  if (error)
    return (
      <div role="alert" className="space-y-3 py-8">
        <p>{error}</p>
        <Button onClick={() => setAttempt((v) => v + 1)}>다시 불러오기</Button>
        <Link to="/friends" className="ml-3 text-sm underline">
          등대로
        </Link>
      </div>
    )
  if (!data)
    return (
      <p role="status" className="py-8">
        친구의 어항을 불러오는 중…
      </p>
    )
  function move(direction: number) {
    setIndex((i) => Math.max(0, Math.min(data!.tanks.length - 1, i + direction)))
  }
  return (
    <section className="flex min-h-0 w-full flex-1 flex-col" aria-label="친구 아쿠아리움">
      {!tank ? (
        <div className="p-4">
          <Link to="/friends" className="text-sm underline">
            친구 목록으로
          </Link>
          <p className="py-16 text-center text-sm text-muted-foreground">
            친구가 아직 어항을 준비하지 않았어요.
          </p>
        </div>
      ) : (
        <>
          <div className="flex h-14 shrink-0 items-center gap-1 border-b bg-background px-2">
            <PlayerAvatar
              nickname={data.owner.nickname}
              path={data.owner.avatar_path}
              className="mr-1 size-10 shrink-0 ring-2 ring-secondary"
            />
            <Link
              to="/friends"
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: 'min-h-11 shrink-0 px-2 text-xs',
              })}
            >
              {data.owner.nickname}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11"
              aria-label="이전 어항"
              disabled={index === 0}
              onClick={() => move(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="min-w-0 flex-1 truncate text-center text-xs">
              {tank.name}
              <span className="ml-1 text-muted-foreground">
                {index + 1}/{data.tanks.length}
              </span>
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11"
              aria-label="다음 어항"
              disabled={index === data.tanks.length - 1}
              onClick={() => move(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div
            className="relative min-h-0 w-full flex-1 overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200"
            aria-label={tank.name}
          >
            {background && (
              <img
                src={backgroundUrl(background.image_path)}
                alt={background.name}
                className="absolute inset-0 size-full object-cover"
              />
            )}
            <TankBubbles />
            <TankInhabitants key={tank.id} items={items} />
            <AquariumCare key={'care:' + tank.id} tank={tank.id} />
          </div>
          <div className="flex shrink-0 divide-x divide-border border-t bg-background pb-[env(safe-area-inset-bottom)]">
            <Link
              to="/aquarium"
              className="flex min-h-12 flex-1 items-center justify-center gap-2 text-xs text-primary"
            >
              <ChevronLeft className="size-4" />내 어항
            </Link>
            <FriendAquariumPicker />
          </div>
        </>
      )}
    </section>
  )
}
