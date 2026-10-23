import { useEffect, useRef, useState } from 'react'
import { Clock3, UserCheck, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { sendFriendRequest } from '@/features/friends/api'
import { useSocial } from '@/features/social/social-provider'
import { socialErrorMessage } from '@/features/social/types'

export type RankingFriend = {
  avatarPath?: string | null
  level?: number
  userId?: string
  friendCode?: string | null
  friendStatus?: 'pending' | 'accepted' | null
}

export function RankingFriendAction({
  player,
}: {
  player: RankingFriend & { nickname: string; mine: boolean }
}) {
  const social = useSocial()
  const [sending, setSending] = useState(false),
    [sent, setSent] = useState(false)
  const lock = useRef(false),
    active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const related = social.requests.find(
    (request) =>
      (request.sender_id === player.userId || request.recipient_id === player.userId) &&
      (request.status === 'accepted' || request.status === 'pending'),
  )
  const status = related?.status ?? (sent ? 'pending' : player.friendStatus)
  const label =
    status === 'accepted' ? '이미 친구예요' : status === 'pending' ? '요청 중' : '친구 요청'
  const Icon = status === 'accepted' ? UserCheck : status === 'pending' ? Clock3 : UserPlus
  async function send() {
    if (lock.current || status || !player.friendCode) return
    lock.current = true
    setSending(true)
    try {
      await sendFriendRequest(player.friendCode)
      if (active.current) {
        setSent(true)
        toast.success('친구 요청을 보냈어요.')
        void social.refresh()
      }
    } catch (cause) {
      if (active.current) toast.error(socialErrorMessage(cause))
    } finally {
      lock.current = false
      if (active.current) setSending(false)
    }
  }
  if (player.mine || !player.friendCode) return <span className="size-11 shrink-0" />
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0"
      title={label}
      aria-label={`${player.nickname} · ${label}`}
      disabled={!!status || sending}
      onClick={() => void send()}
    >
      <Icon className="size-4" />
    </Button>
  )
}
