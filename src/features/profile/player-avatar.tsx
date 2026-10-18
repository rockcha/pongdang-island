import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { avatarUrl } from './avatar-api'
import { useState } from 'react'

export function PlayerAvatar({ nickname, path, className, preview }: { nickname?: string; path?: string | null; className?: string; preview?: string }) {
  const src = preview ?? avatarUrl(path)
  const [settled, setSettled] = useState<string>()
  const pending = Boolean(src && settled !== src)
  return <Avatar className={className}>
    <AvatarImage src={src} alt={`${nickname || '나'}의 아바타`} className="motion-safe:animate-[game-screen-enter_150ms_ease-out]" onLoadingStatusChange={status=>{if(status==='loaded'||status==='error')setSettled(src)}} />
    <AvatarFallback className={'bg-primary/10 text-primary '+(pending?'motion-safe:animate-pulse':'')}>{nickname?.slice(0,2) || '퐁당'}</AvatarFallback>
  </Avatar>
}
