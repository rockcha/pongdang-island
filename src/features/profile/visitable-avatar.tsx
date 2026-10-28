import type {ComponentProps} from 'react'
import {useAuth} from '@/components/auth-provider'
import {PlayerLevel,AvatarLevelBadge} from '@/features/experience/player-level'
import {PlayerAvatar} from './player-avatar'
import {PlayerVisitMenu} from './player-visit-menu'

/** Visit controls and level controls are siblings, never nested buttons or links. */
export function VisitableAvatar(props:ComponentProps<typeof PlayerAvatar>){
 const {session}=useAuth()
 if(!props.userId)return <PlayerAvatar {...props}/>
 return <span className="pointer-events-auto relative inline-flex shrink-0 self-start">
  <PlayerVisitMenu userId={props.userId} nickname={props.nickname||'퐁이'} avatarPath={props.preview??props.path} mine={props.userId===session?.user.id} avatarClassName={props.className}/>
  {props.level!=null?<AvatarLevelBadge level={props.level} levelProgress={props.levelProgress}/>:<PlayerLevel userId={props.userId} friendCode={props.friendCode} avatar/>}
 </span>
}
