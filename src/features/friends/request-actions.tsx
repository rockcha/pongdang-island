import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { useSocial } from '@/features/social/social-provider'
import { socialErrorMessage } from '@/features/social/types'
import type { FriendRequest, RequestAction } from '@/features/social/types'
import { respondFriendRequest } from './api'

export function RequestActions({ request }: { request: Pick<FriendRequest, 'id' | 'sender_id' | 'recipient_id' | 'status'> }) {
  const { session } = useAuth()
  const { refresh } = useSocial()
  const [busy, setBusy] = useState(false)
  async function act(action: RequestAction) {
    if (busy) return
    setBusy(true)
    try {
      await respondFriendRequest(request.id, action)
      toast.success(action === 'accept' ? '친구가 됐어요!' : action === 'decline' ? '친구 요청을 거절했어요.' : '친구 요청을 취소했어요.')
    } catch (cause) { toast.error(socialErrorMessage(cause)) }
    finally { await refresh(); setBusy(false) }
  }
  const labels = { accepted: '수락한 요청', declined: '거절한 요청', cancelled: '취소된 요청', removed: '친구 관계가 종료됐어요' }
  if (request.status !== 'pending') return <p className="text-xs text-muted-foreground">{labels[request.status]}</p>
  if (request.recipient_id === session?.user.id) return <div className="flex gap-2">
    <Button className="min-h-11" disabled={busy} onClick={() => void act('accept')}>수락</Button>
    <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void act('decline')}>거절</Button>
  </div>
  if (request.sender_id === session?.user.id) return <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void act('cancel')}>요청 취소</Button>
  return null
}
