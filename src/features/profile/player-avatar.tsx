import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { avatarUrl } from './avatar-api'
import { useState } from 'react'
import {AvatarLevelBadge,PlayerLevel} from '@/features/experience/player-level'

export function PlayerAvatar({ nickname, path, className, preview,userId,level,friendCode }: { nickname?: string; path?: string | null; className?: string; preview?: string;userId?:string|null;level?:number|null;friendCode?:string }) {
  const src = preview ?? avatarUrl(path) ?? '/branding/pongi.png'
  const [settled, setSettled] = useState<string>()
  const pending = Boolean(src && settled !== src)
  const picture=<Avatar className={className}>
    <AvatarImage src={src} alt={`${nickname || '나'}의 아바타`} className={(preview||path?'':'bg-secondary object-contain p-0.5 ')+'motion-safe:animate-[game-screen-enter_150ms_ease-out]'} onLoadingStatusChange={status=>{if(status==='loaded'||status==='error')setSettled(src)}} />
    <AvatarFallback className={'overflow-hidden bg-secondary '+(pending?'motion-safe:animate-pulse':'')}><img src="/branding/pongi.png" alt="기본 퐁이 아바타" className="size-full object-contain p-0.5"/></AvatarFallback>
  </Avatar>
  return userId||level!=null?<span className="relative inline-flex shrink-0">{picture}{level!=null?<AvatarLevelBadge level={level}/>:<PlayerLevel userId={userId} friendCode={friendCode} avatar/>}</span>:picture
}
