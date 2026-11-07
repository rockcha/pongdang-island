import {useCallback} from 'react'
import {Heart} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {useAccountResource} from '@/lib/account-query'
import {readAquariumLike} from './aquarium-likes-api'

export function OwnAquariumLikeCount(){
 const {session}=useAuth()
 return session?<AquariumLikeCount key={session.user.id} owner={session.user.id}/>:null
}
function AquariumLikeCount({owner}:{owner:string}){
 const read=useCallback((signal:AbortSignal)=>readAquariumLike(owner,signal),[owner])
 const query=useAccountResource(['aquarium-likes',owner],read)
 const count=query.data?.count
 const label=count!==undefined?`내 아쿠아리움 누적 좋아요 ${count.toLocaleString('ko-KR')}개`:query.isError?'좋아요 수를 불러오지 못했어요':'좋아요 수를 불러오는 중이에요'
 return <span role="img" aria-label={label} title={label} className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-rose-50 px-1.5 text-[10px] font-normal tabular-nums text-rose-600 dark:bg-rose-950/30 dark:text-rose-300"><Heart aria-hidden="true" className="size-3"/><span aria-hidden="true">{count!==undefined?count.toLocaleString('ko-KR'):query.isError?'—':'…'}</span></span>
}
