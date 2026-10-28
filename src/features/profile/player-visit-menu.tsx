import {Menu} from '@base-ui/react/menu'
import {Fish,ShoppingBasket,ChevronDown,UserPlus,Clock3} from 'lucide-react'
import {Link} from 'react-router'
import {PlayerAvatar} from './player-avatar'
import {useEffect,useRef,useState} from 'react'
import {useAuth} from '@/components/auth-provider'
import {useSocial} from '@/features/social/social-provider'
import {sendPlayerFriendRequest} from '@/features/friends/api'
import {socialErrorMessage} from '@/features/social/types'
import {toast} from 'sonner'

type Props={userId:string;nickname:string;avatarPath?:string|null;mine?:boolean;avatarClassName?:string}
export function PlayerVisitMenu(props:Props){
 const {session}=useAuth()
 return <VisitMenu key={`${session?.user.id}:${props.userId}`} {...props}/>
}
function VisitMenu({userId,nickname,avatarPath,mine=false,avatarClassName='size-8'}:Props){
 const {session}=useAuth(),social=useSocial()
 const relationship=(social.requests??[]).find(r=>(r.sender_id===userId&&r.recipient_id===session?.user.id||r.recipient_id===userId&&r.sender_id===session?.user.id)&&r.status==='accepted')
  ??(social.requests??[]).find(r=>(r.sender_id===userId&&r.recipient_id===session?.user.id||r.recipient_id===userId&&r.sender_id===session?.user.id)&&r.status==='pending')
 const friend=relationship?.status==='accepted',incoming=relationship?.status==='pending'&&relationship.recipient_id===session?.user.id
 const [sent,setSent]=useState(false),[busy,setBusy]=useState(false)
 const locked=useRef(false),alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 const pending=sent||relationship?.status==='pending'
 const links=[{label:'아쿠아리움 방문',to:mine?'/aquarium':`/friends/${userId}/aquarium`,icon:Fish},...(mine||friend?[{label:'통발 방문',to:mine?'/expeditions':`/friends/${userId}/expeditions`,icon:ShoppingBasket}]:[])]
 async function add(){
  if(locked.current||pending||friend||mine)return
  locked.current=true;setBusy(true)
  try{await sendPlayerFriendRequest(userId);if(alive.current){setSent(true);toast.success('친구 요청을 보냈어요.');void social.refresh().catch(()=>{})}}
  catch(cause){if(alive.current){toast.error(socialErrorMessage(cause));void social.refresh().catch(()=>{})}}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 return <Menu.Root>
  <Menu.Trigger aria-label={`${nickname} 방문 메뉴`} title="방문하기" className="pointer-events-auto relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring">
   <PlayerAvatar nickname={nickname} path={avatarPath} className={avatarClassName}/>
   <ChevronDown aria-hidden="true" className="absolute bottom-0.5 right-0 size-3 rounded-full bg-background text-primary"/>
  </Menu.Trigger>
  <Menu.Portal><Menu.Positioner align="start" sideOffset={6} collisionPadding={12} className="z-[80]"><Menu.Popup aria-label={`${nickname} 방문`} className="w-44 rounded-xl border border-border/60 bg-popover p-1 text-popover-foreground shadow-lg outline-none">
   {links.map(({label,to,icon:Icon})=><Menu.LinkItem key={to} render={<Link to={to} state={{aquariumVisit:true}}/>} className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-xs outline-none transition-colors data-highlighted:bg-secondary/60"><Icon aria-hidden="true" className="size-4 text-primary"/>{label}</Menu.LinkItem>)}
   {!mine&&!friend&&(incoming?<Menu.LinkItem render={<Link to="/friends"/>} className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-xs outline-none data-highlighted:bg-secondary/60"><Clock3 className="size-4 text-primary"/>받은 요청 확인</Menu.LinkItem>:<Menu.Item disabled={pending||busy||social.loading} onClick={()=>void add()} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-xs outline-none data-highlighted:bg-secondary/60 data-disabled:cursor-default data-disabled:opacity-50">{pending||busy?<Clock3 className="size-4 text-muted-foreground"/>:<UserPlus className="size-4 text-primary"/>}{busy?'요청 보내는 중':pending?'요청 중':'친구 추가'}</Menu.Item>)}
  </Menu.Popup></Menu.Positioner></Menu.Portal>
 </Menu.Root>
}
