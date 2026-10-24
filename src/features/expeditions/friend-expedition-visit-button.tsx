import {useNavigate,useLocation} from 'react-router'
import {Check} from 'lucide-react'
import {Button} from '@/components/ui/button'
import type {FriendExpedition} from './api'

export function FriendExpeditionVisitButton({owner,nickname,status,statusError,now,onVisit}:{owner:string;nickname:string;status?:FriendExpedition;statusError:boolean;now:number;onVisit?:()=>void}){
 const navigate=useNavigate()
 const location=useLocation()
 const sailing=!!status?.expedition_id&&Date.parse(status.returns_at??'')>now
 const label=statusError?'확인 불가':!status?'확인 중':!sailing?'통발 없음':status.boosted?'도움 완료':'물고기 유인하기'
 return <Button variant="ghost" aria-label={`${nickname}님 ${label}`} title={sailing?`${nickname}님의 통발 방문`:label} disabled={statusError||!sailing} className="h-auto min-h-12 min-w-14 flex-col gap-0 rounded-xl px-1 text-primary disabled:opacity-35" onClick={()=>{onVisit?.();void navigate(`/friends/${owner}/expeditions`,{state:location.pathname==='/friends'?{friendListReturnKey:location.key}:undefined})}}>
  {status?.boosted&&sailing?<Check className="size-7"/>:<img src="/notification-icons/expedition-boost.png" alt="" className="size-7 object-contain"/>}<span className="text-[9px] leading-4">{label}</span>
 </Button>
}
