import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { avatarUrl } from './avatar-api'

export function PlayerAvatar({ nickname, path, className, preview }: { nickname?: string; path?: string | null; className?: string; preview?: string }) {
  return <Avatar className={className}>
    <AvatarImage src={preview ?? avatarUrl(path)} alt={`${nickname || '나'}의 아바타`} />
    <AvatarFallback className="bg-primary/10 text-primary">{nickname?.slice(0,2) || '퐁당'}</AvatarFallback>
  </Avatar>
}
