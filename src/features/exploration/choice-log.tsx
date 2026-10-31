import type {CombatEvent} from './combat-state'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {TypedText} from './typed-text'
import {npcLineText} from './npc-dialogue'

export function ChoiceLog({event,text,className='',nickname,speaker='탐험',avatarPath,label='탐험 로그'}:{event?:CombatEvent;text:string;className?:string;nickname?:string;speaker?:string;avatarPath?:string|null;label?:string}){
 const harmful=event&&(event.kind==='monster'||event.target==='player'||event.kind==='system'&&text==='사망하였습니다.'||event.kind==='status'&&['blind','weaken','magic-break','mana-drain'].includes(event.effect??''))
 return <div data-harmful={harmful||undefined} className={`exploration-choice-log ${className}`} role="status" aria-live="polite" aria-label={label}>
  {nickname?<div className="exploration-dialogue"><PlayerAvatar nickname={nickname} path={avatarPath} className="size-5"/><p><strong>{nickname}:</strong> <TypedText text={npcLineText(text)}/></p></div>:<p><strong className="exploration-log-speaker">{speaker}:</strong> <TypedText text={npcLineText(text)}/></p>}
 </div>
}
