import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
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
  return <AlertDialog open={open} onOpenChange={value=>{if(!busy){setOpen(value);setError('')}}}>
    <AlertDialogTrigger render={<Button variant="ghost" className="min-h-11 shrink-0 text-xs text-muted-foreground hover:text-destructive" aria-label={`${nickname}님과 친구 끊기`} />}>친구 끊기</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>친구 관계를 끊을까요?</AlertDialogTitle><AlertDialogDescription>{nickname}님이 서로의 친구 목록에서 사라져요. 상대방에게 별도 알림은 보내지 않아요.</AlertDialogDescription></AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={busy} className="min-h-11">취소</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={()=>void confirm()} className="min-h-11">{busy?'처리 중…':'친구 끊기'}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
