import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/components/auth-provider'
import { appArt } from '@/components/app-art'
import { Button } from '@/components/ui/button'
import { useFriendExpeditions } from '@/features/expeditions/use-friend-expeditions'

export function FriendAquariumActions({ owner, nickname }: { owner: string; nickname: string }) {
  const { session } = useAuth(),
    navigate = useNavigate()
  const status = useFriendExpeditions(session?.user.id, owner)
  const trap = status.friends.find((friend) => friend.friend_id === owner)
  const available =
    !status.error &&
    !!trap?.expedition_id &&
    !trap.boosted &&
    Date.parse(trap.returns_at ?? '') > status.now
  const reason = status.error
    ? '통발 상태를 확인하지 못했어요'
    : !trap
      ? '통발 확인 중'
      : trap.boosted
        ? '이미 이 통발을 도왔어요'
        : '유인할 통발이 없어요'
  const actionClass =
    'flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-secondary/30 px-2 text-xs text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <nav
      aria-label="친구에게 마음 전하기"
      className="grid shrink-0 grid-cols-2 gap-2 border-b bg-background px-3 py-2"
    >
      <Button
        variant="ghost"
        className={actionClass}
        disabled={!available}
        title={available ? '친구의 통발에 물고기를 유인해 주세요' : reason}
        onClick={() => {
          if (available) void navigate(`/friends/${owner}/expeditions`)
        }}
      >
        <img
          src="/notification-icons/expedition-boost.png"
          alt=""
          className="size-6 object-contain"
        />
        통발 유인
      </Button>
      <Link
        to={`/storage?giftTo=${owner}`}
        aria-label={`${nickname}에게 선물하기`}
        className={actionClass}
      >
        <appArt.mailGift className="size-6" />
        선물
      </Link>
    </nav>
  )
}
