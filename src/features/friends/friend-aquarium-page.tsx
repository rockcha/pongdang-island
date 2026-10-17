import {useEffect,useMemo,useState} from 'react'
import {Link,useParams} from 'react-router'
import {ChevronLeft,ChevronRight,List} from 'lucide-react'
import {Button,buttonVariants} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {TankInhabitants} from '@/features/aquarium/tank-inhabitants'
import {TankBubbles} from '@/features/aquarium/tank-bubbles'
import {backgroundUrl} from '@/features/aquarium/api'
import {groupCollectibles} from '@/features/aquarium/collectible-groups'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {rarities} from '@/lib/game/rarity'
import {loadFriendAquarium,visitError} from './aquarium-api'
import type {FriendAquarium} from './aquarium-api'
import {AquariumCare} from './aquarium-care'

export function FriendAquariumPage(){const {ownerId}=useParams();return <Visit key={ownerId} owner={ownerId??''}/>}
function Visit({owner}:{owner:string}){
 const [data,setData]=useState<FriendAquarium|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[index,setIndex]=useState(0),[list,setList]=useState(false)
 useEffect(()=>{let active=true;loadFriendAquarium(owner).then(value=>{if(active){setData(value);setError('')}}).catch(cause=>{if(active)setError(visitError(cause))});return()=>{active=false}},[owner,attempt])
 const tank=data?.tanks[index]
 const items=useMemo(()=>data?.inhabitants.filter(item=>item.tank_id===tank?.id).map(item=>({...item,interaction_locked:true}))??[],[data,tank?.id])
 const groups=useMemo(()=>groupCollectibles(items),[items])
 const background=data?.backgrounds.find(b=>b.id===tank?.background_id)
 if(error)return <div role="alert" className="space-y-3 py-8"><p>{error}</p><Button onClick={()=>setAttempt(v=>v+1)}>다시 불러오기</Button><Link to="/friends" className="ml-3 text-sm underline">등대로</Link></div>
 if(!data)return <p role="status" className="py-8">친구의 어항을 불러오는 중…</p>
 function move(direction:number){setIndex(i=>Math.max(0,Math.min(data!.tanks.length-1,i+direction)));setList(false)}
 return <section className="flex min-h-0 w-full flex-1 flex-col" aria-label="친구 아쿠아리움">
  {!tank?<div className="p-4"><Link to="/friends" className="text-sm underline">친구 목록으로</Link><p className="py-16 text-center text-sm text-muted-foreground">친구가 아직 어항을 준비하지 않았어요.</p></div>:<>
   <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2"><Link to="/friends" className={buttonVariants({variant:'ghost',size:'sm',className:'min-h-11 shrink-0 px-2 text-xs'})}>‹ 친구 목록</Link><Button variant="ghost" size="icon" className="min-h-11" aria-label="이전 어항" disabled={index===0} onClick={()=>move(-1)}><ChevronLeft className="size-4"/></Button><p className="min-w-0 flex-1 truncate text-center text-xs">{tank.name}<span className="ml-1 text-muted-foreground">{index+1}/{data.tanks.length}</span></p><Button variant="ghost" size="icon" className="min-h-11" aria-label="다음 어항" disabled={index===data.tanks.length-1} onClick={()=>move(1)}><ChevronRight className="size-4"/></Button></div>
   <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200" aria-label={tank.name}>
    {background&&<img src={backgroundUrl(background.image_path)} alt={background.name} className="absolute inset-0 size-full object-cover"/>}
    <TankBubbles/><TankInhabitants key={tank.id} items={items}/><AquariumCare key={'care:'+tank.id} tank={tank.id}/>
    <div className="pointer-events-none absolute left-3 right-28 top-3 z-20 flex w-fit max-w-[calc(100%-8rem)] items-center gap-2 rounded-2xl border border-white/70 bg-background/95 px-3 py-2 shadow-sm"><PlayerAvatar nickname={data.owner.nickname} path={data.owner.avatar_path} className="size-10 shrink-0"/><div className="min-w-0"><p className="truncate text-sm font-semibold">{data.owner.nickname}</p><p className="text-[11px] text-muted-foreground">친구의 아쿠아리움</p></div></div>
    <Button variant="secondary" size="sm" className="absolute right-3 top-3 z-20 min-h-11 rounded-full bg-background/95 shadow-sm" onClick={()=>setList(true)}><List className="mr-1 size-4"/>개체 목록</Button>
   </div>
   <Dialog open={list} onOpenChange={setList}><DialogContent className="flex h-[min(75dvh,620px)] flex-col"><DialogHeader><DialogTitle>{tank.name}의 개체</DialogTitle><DialogDescription>함께 살고 있는 생물과 장식품을 살펴보세요.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto">{groups.length?<ul className="divide-y">{groups.map(group=><li key={group.species.id} className="flex gap-3 py-3"><CollectibleThumbnail species={group.species} path={group.species.thumbnail_path} name={group.species.name} className="size-14 shrink-0"/><div className="min-w-0"><p className="text-sm font-medium">{group.species.name} <span className="text-xs text-muted-foreground">×{group.items.length}</span></p><p className="text-xs text-muted-foreground">{rarities[group.species.rarity].label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{group.species.description}</p></div></li>)}</ul>:<p className="py-8 text-center text-sm text-muted-foreground">아직 배치된 개체가 없어요.</p>}</div></DialogContent></Dialog>
  </>}
 </section>
}
