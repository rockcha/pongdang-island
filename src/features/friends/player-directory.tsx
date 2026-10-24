import {useEffect,useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {LevelInsignia} from '@/features/experience/level-insignia'
import {EquippedTitleText} from '@/features/titles/equipped-title-text'
import {socialErrorMessage} from '@/features/social/types'
import {toast} from 'sonner'
import {loadPlayerDirectory,sendPlayerFriendRequest} from './api'
import type {PlayerDirectory} from './api'

export function PlayerDirectoryList({onRequestSent}:{onRequestSent:()=>Promise<unknown>}){
 const [page,setPage]=useState(0),[attempt,setAttempt]=useState(0)
 const [data,setData]=useState<PlayerDirectory|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const [sending,setSending]=useState<string|null>(null),lock=useRef(false)
 useEffect(()=>{
  let active=true
  setLoading(true);setError('')
  loadPlayerDirectory(page*20,20).then(value=>{if(active)setData(value)}).catch(cause=>{if(active){setData(null);setError(socialErrorMessage(cause))}}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[page,attempt])
 async function add(id:string){
  if(lock.current)return
  lock.current=true;setSending(id)
  try{
   await sendPlayerFriendRequest(id)
   setData(old=>old?{...old,players:old.players.map(player=>player.id===id?{...player,relationship:'outgoing'}:player)}:old)
   toast.success('친구 요청을 보냈어요.')
   void onRequestSent().catch(()=>{})
  }catch(cause){toast.error(socialErrorMessage(cause));setAttempt(value=>value+1)}
  finally{lock.current=false;setSending(null)}
 }
 return <section aria-label="전체 유저 목록" className="space-y-3">
  {loading?<p role="status" className="py-8 text-center text-sm text-muted-foreground">유저 목록을 불러오는 중…</p>:error?<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>setAttempt(value=>value+1)}>다시 불러오기</Button></div>:<>
   <ul className="divide-y divide-border/70">{data?.players.map(player=><li key={player.id} className="flex min-w-0 items-center gap-3 py-4 first:pt-1" aria-label={`${player.nickname} 유저`}>
    <PlayerAvatar nickname={player.nickname} path={player.avatar_path} className="size-12 shrink-0 ring-2 ring-secondary"/>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{player.nickname}</p><span aria-label={`레벨 ${player.level}`} className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground"><LevelInsignia level={player.level} className="size-4"/>Lv.{player.level}</span>{player.equipped_title&&<p className="mt-1 truncate text-[11px] text-primary"><EquippedTitleText name={player.equipped_title}/></p>}</div>
    <Button variant={player.relationship==='none'?'secondary':'ghost'} className="min-h-11 shrink-0 px-3 text-xs" disabled={sending!==null||player.relationship!=='none'} aria-label={`${player.nickname} ${player.relationship==='none'?'친구 추가':player.relationship==='friend'?'이미 친구':player.relationship==='incoming'?'받은 요청':'요청 중'}`} onClick={()=>void add(player.id)}>{sending===player.id?'요청 중…':player.relationship==='friend'?'친구':player.relationship==='incoming'?'받은 요청':player.relationship==='outgoing'?'요청 중':'친구 추가'}</Button>
   </li>)}</ul>
   {!data?.players.length&&<p className="py-8 text-center text-sm text-muted-foreground">표시할 유저가 없어요.</p>}
  </>}
  <div className="flex items-center justify-center gap-3 border-t border-border/70 pt-3"><Button variant="ghost" disabled={loading||sending!==null||page===0} onClick={()=>setPage(value=>value-1)}>이전</Button><span className="text-xs tabular-nums text-muted-foreground">{page+1}페이지</span><Button variant="ghost" disabled={loading||sending!==null||!!error||!data?.hasMore} onClick={()=>setPage(value=>value+1)}>다음</Button></div>
 </section>
}
