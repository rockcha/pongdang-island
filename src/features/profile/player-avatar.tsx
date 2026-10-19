import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { avatarUrl } from './avatar-api'
import { useState } from 'react'

export function PlayerAvatar({ nickname, path, className, preview }: { nickname?: string; path?: string | null; className?: string; preview?: string }) {
  const src = preview ?? avatarUrl(path) ?? '/branding/pongi.png'
  const [settled, setSettled] = useState<string>()
  const pending = Boolean(src && settled !== src)
  return <Avatar className={className}>
    <AvatarImage src={src} alt={`${nickname || '나'}의 아바타`} className={(preview||path?'':'bg-secondary object-contain p-0.5 ')+'motion-safe:animate-[game-screen-enter_150ms_ease-out]'} onLoadingStatusChange={status=>{if(status==='loaded'||status==='error')setSettled(src)}} />
    <AvatarFallback className={'overflow-hidden bg-secondary '+(pending?'motion-safe:animate-pulse':'')}><img src="/branding/pongi.png" alt="기본 퐁이 아바타" className="size-full object-contain p-0.5"/></AvatarFallback>
  </Avatar>
}
