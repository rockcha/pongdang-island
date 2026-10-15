import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useSocial } from '@/features/social/social-provider'
import { socialErrorMessage } from '@/features/social/types'
import { removeFriend } from './api'

export function RemoveFriendButton({requestId,nickname}:{requestId:string;nickname:string}) {
  const [open,setOpen]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const {refresh}=useSocial()
  async function confirm() {
    if(busy)return
    setBusy(true);setError('')
    try {
      await removeFriend(requestId)
      setOpen(false)
      toast.success('친구 관계를 정리했어요.')
    } catch(cause) {setError(socialErrorMessage(cause))}
    finally {await refresh();setBusy(false)}
  }
  return <ConfirmDialog open={open} onOpenChange={value=>{setOpen(value);setError('')}}
   trigger={<Button variant="ghost" className="min-h-11 shrink-0 text-xs text-muted-foreground hover:text-destructive" aria-label={`${nickname}님과 친구 끊기`}>친구 끊기</Button>}
   title={`${nickname}님과 친구 관계를 끊겠습니까?`}
   description="서로의 친구 목록에서 사라져요. 상대방에게 별도 알림은 보내지 않아요."
   busy={busy} error={error} onConfirm={()=>void confirm()}/>
}
