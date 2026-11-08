import {useId,useMemo,useRef,useState,type ReactNode} from 'react'
import {Link,useSearchParams} from 'react-router'
import {ArrowLeft,ChevronDown,ChevronUp,ChevronRight,Heart,Users} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {useAccountResource} from '@/lib/account-query'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {AccountFarm} from './account-farm'
import {TopviewFarm} from './topview-farm'
import {farmVisitState,readFarmFriends,readFriendFarm,setFarmLike,type FarmFriends,type FarmOwner,type FriendFarm} from './visits-api'
import './farm-friends.css'

export function FarmFriendStrip({data,selected,onVisit,disabled=false,loading=false,error=false,onRetry}:{data?:FarmFriends;selected:string|null;onVisit:(id:string|null)=>void;disabled?:boolean;loading?:boolean;error?:boolean;onRetry?:()=>void}){
 const [open,setOpen]=useState(false),[search,setSearch]=useState(''),[collapsed,setCollapsed]=useState(false),stripId=useId()
 const friends=data?.friends??[],visible=friends.filter(f=>f.nickname.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
 function choose(id:string|null){if(disabled)return;onVisit(id);setOpen(false);setSearch('')}
 function avatar(owner:FarmOwner|null,mine=false){return <button key={owner?.id??'self'} type="button" className="farm-friend-avatar" disabled={disabled} aria-current={(mine?!selected:selected===owner?.id)?'page':undefined} aria-label={mine?'내 농장 보기':`${owner?.nickname} 농장 방문`} onClick={()=>choose(mine?null:owner!.id)}><PlayerAvatar nickname={mine?'나':owner?.nickname} path={owner?.avatar_path} className="farm-friend-picture"/><span>{mine?'나':owner?.nickname}</span></button>}
 return <><div className="farm-friend-section" data-collapsed={collapsed}><button type="button" className="farm-friend-toggle" aria-expanded={!collapsed} aria-controls={stripId} onClick={()=>setCollapsed(value=>!value)}><Users size={14}/><span>친구 목록 {collapsed?'펼치기':'접기'}</span>{collapsed?<ChevronDown size={14}/>:<ChevronUp size={14}/>}</button>{!collapsed&&<nav id={stripId} className="farm-friend-strip" aria-label="친구 농장">
  {avatar(data?.self??null,true)}
  <div className="farm-friend-scroll">{friends.slice(0,5).map(f=>avatar(f))}{selected&&!friends.slice(0,5).some(f=>f.id===selected)&&friends.find(f=>f.id===selected)&&avatar(friends.find(f=>f.id===selected)!)}
   {loading&&!data&&<span className="farm-friend-note" role="status">친구를 불러오는 중…</span>}
   {error&&<button type="button" className="farm-friend-note" onClick={onRetry}>친구 목록 다시 불러오기</button>}
   {!loading&&!error&&data&&!friends.length&&<Link className="farm-friend-empty" to="/friends"><Users size={15}/>친구 농장 둘러보기<ChevronRight size={13}/></Link>}
  </div>
  {!!friends.length&&<button type="button" className="farm-friend-all" disabled={disabled} onClick={()=>setOpen(true)} aria-label="친구 농장 전체 보기">전체<ChevronRight size={13}/></button>}
 </nav>}</div>
 <Dialog open={open} onOpenChange={value=>{setOpen(value);if(!value)setSearch('')}}><DialogContent className="farm-friends-dialog"><DialogHeader><DialogTitle>친구 농장</DialogTitle><DialogDescription>친구의 농장에 놀러 가요.</DialogDescription></DialogHeader><input aria-label="친구 닉네임 검색" placeholder="닉네임 검색" value={search} onChange={e=>setSearch(e.target.value)}/><div className="farm-friends-list">{visible.map(f=><button type="button" key={f.id} aria-label={`${f.nickname} 농장 방문`} disabled={disabled} onClick={()=>choose(f.id)}><PlayerAvatar nickname={f.nickname} path={f.avatar_path} className="farm-friend-picture"/><span>{f.nickname}</span><ChevronRight size={15}/></button>)}{!visible.length&&<p>검색한 친구가 없어요.</p>}</div></DialogContent></Dialog></>
}

export function FarmVisit({data,onReturn,strip}:{data:FriendFarm;onReturn:()=>void;strip:ReactNode}){
 const state=useMemo(()=>farmVisitState(data),[data]),[busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false)
 async function like(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await setFarmLike(data.owner.id,!data.liked)}catch{setError('좋아요를 저장하지 못했어요. 다시 눌러주세요.')}finally{lock.current=false;setBusy(false)}}
 const header=<div className="farm-visit-heading"><button type="button" className="farm-visit-return" onClick={onReturn}><ArrowLeft size={16}/><span>내 농장</span></button><div className="farm-visit-owner"><PlayerAvatar nickname={data.owner.nickname} path={data.owner.avatar_path} className="farm-visit-picture"/><h1 id="farm-visit-title">{data.owner.nickname}의 농장</h1></div><button type="button" className="farm-visit-like" aria-label="농장 좋아요" aria-pressed={data.liked} disabled={busy} onClick={()=>void like()}><Heart size={17} fill={data.liked?'currentColor':'none'}/><span>{data.likeCount.toLocaleString('ko-KR')}</span></button>{error&&<p className="farm-visit-error" role="alert">{error}</p>}</div>
 return <TopviewFarm visit={{state,header}} headerExtra={strip}/>
}

export function FarmWithFriends(){
 const {session}=useAuth(),[params,setParams]=useSearchParams(),target=params.get('visit'),owner=target===session?.user.id?null:target
 // Read tracked query fields during this render. Reading them only inside the
 // deferred header callback can miss a response that arrives before the farm.
 const {data:directory,isLoading:directoryLoading,isError:directoryError,refetch:refetchDirectory}=useAccountResource('farm-friends',readFarmFriends),valid=!!owner&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)
 const visit=useAccountResource(['friend-farm',owner],signal=>readFriendFarm(owner??'',signal),{enabled:valid})
 function choose(id:string|null){const next=new URLSearchParams(params);if(id)next.set('visit',id);else next.delete('visit');setParams(next)}
 const strip=(disabled=false)=><FarmFriendStrip data={directory} selected={owner} onVisit={choose} disabled={disabled} loading={directoryLoading} error={directoryError} onRetry={()=>void refetchDirectory()}/>
 if(!owner)return <AccountFarm headerExtra={strip}/>
 if(!visit.data||!valid||visit.isError)return <section className="farm-visit-loading"><p role={visit.isError||!valid?'alert':'status'}>{visit.isError||!valid?'친구의 농장을 방문할 수 없어요. 친구 관계와 농장 개설 여부를 확인해주세요.':'친구 농장으로 가고 있어요…'}</p><button type="button" onClick={()=>choose(null)}><ArrowLeft size={16}/>내 농장으로</button>{visit.isError&&<button type="button" onClick={()=>void visit.refetch()}>다시 불러오기</button>}</section>
 return <FarmVisit key={owner} data={visit.data} onReturn={()=>choose(null)} strip={strip()}/>
}
