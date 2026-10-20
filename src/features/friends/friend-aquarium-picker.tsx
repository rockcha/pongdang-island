import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { appArt } from '@/components/app-art'
import { useAuth } from '@/components/auth-provider'
import { useSocial } from '@/features/social/social-provider'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function FriendAquariumPicker() {
  const { session } = useAuth()
  const { requests, loading, error, refresh, owner } = useSocial()
  const [open, setOpen] = useState(false)
  const userId = session?.user.id
  const storageKey = `pongdang:recent-aquariums:${userId ?? 'guest'}`
  function recentIds(): string[] {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
    } catch {
      return []
    }
  }
  const recent = recentIds()
  const friends =
    owner === userId
      ? requests
          .filter(
            (r) => r.status === 'accepted' && (r.sender_id === userId || r.recipient_id === userId),
          )
          .map((r) => ({
            id: r.sender_id === userId ? r.recipient_id : r.sender_id,
            profile: r.sender_id === userId ? r.recipient : r.sender,
          }))
          .sort((a, b) => {
            const aIndex = recent.indexOf(a.id),
              bIndex = recent.indexOf(b.id)
            return (
              (aIndex < 0 ? Infinity : aIndex) - (bIndex < 0 ? Infinity : bIndex) ||
              (a.profile?.nickname ?? '').localeCompare(b.profile?.nickname ?? '')
            )
          })
      : []
  function visit(id: string) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify([id, ...recent.filter((v) => v !== id)].slice(0, 12)),
      )
    } catch {
      /* Visits still work without storage. */
    }
    setOpen(false)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" className="min-h-12 flex-1 rounded-none text-xs" />}
      >
        <appArt.aquarium className="size-6" />
        친구 어항
      </DialogTrigger>
      <DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[80dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-4 overflow-hidden rounded-t-xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>친구 어항</DialogTitle>
          <DialogDescription>
            친구를 누르면 바로 방문해요. 최근 방문한 친구가 먼저 보여요.
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <p role="status" className="py-6 text-center text-sm text-muted-foreground">
            친구를 불러오는 중…
          </p>
        )}
        {error && (
          <div role="alert" className="space-y-2 text-sm">
            <p>{error}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              다시 불러오기
            </Button>
          </div>
        )}
        <div
          aria-label="방문할 친구 목록"
          className="min-h-0 max-h-[60dvh] flex-1 touch-pan-y overflow-y-auto overscroll-contain divide-y divide-border"
        >
          {friends.map((friend) => (
            <Link
              key={friend.id}
              to={`/friends/${friend.id}/aquarium`}
              onClick={() => visit(friend.id)}
              className="flex min-h-18 items-center gap-3 rounded-lg px-2 py-3 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <PlayerAvatar
                nickname={friend.profile?.nickname}
                path={friend.profile?.avatar_path}
                className="size-11 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{friend.profile?.nickname ?? '친구'}</span>
                {friend.profile?.equipped_title && (
                  <span className="mt-1 flex items-center gap-1 truncate text-[11px] text-primary">
                    <appArt.title className="size-4" />
                    {friend.profile.equipped_title}
                  </span>
                )}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
        {!loading && !error && !friends.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            아직 함께 구경할 친구가 없어요.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
