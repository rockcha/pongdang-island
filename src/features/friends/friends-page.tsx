import { useState } from 'react'
import type { FormEvent } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSocial } from '@/features/social/social-provider'
import { socialErrorMessage } from '@/features/social/types'
import type { Profile } from '@/features/social/types'
import { findPlayer, sendFriendRequest } from './api'
import { RequestActions } from './request-actions'
import { RemoveFriendButton } from './remove-friend-button'
import { PlayerAvatar } from '@/features/profile/player-avatar'

type Tab='friends'|'requests'|'invite'
export function FriendsPage() {
  const {session}=useAuth()
  const {profile,requests,loading,error,refresh}=useSocial()
  const [tab,setTab]=useState<Tab>('friends')
  const [code,setCode]=useState('')
  const [found,setFound]=useState<Profile|null>(null)
  const [searched,setSearched]=useState(false)
  const [busy,setBusy]=useState(false)
  const [searchError,setSearchError]=useState('')
  const incoming=requests.filter(r=>r.status==='pending' && r.recipient_id===session?.user.id)
  const outgoing=requests.filter(r=>r.status==='pending' && r.sender_id===session?.user.id)
  const friends=requests.filter(r=>r.status==='accepted')
  const related=found && requests.find(r=>r.sender_id===found.id || r.recipient_id===found.id)
  async function search(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized=code.trim().toUpperCase()
    if(!/^[A-F0-9]{12}$/.test(normalized)){setSearchError('친구 코드는 영문 A~F와 숫자 12자리예요.');return}
    setBusy(true);setSearchError('');setFound(null);setSearched(false)
    try{setFound(await findPlayer(normalized));setSearched(true)}catch(cause){setSearchError(socialErrorMessage(cause))}finally{setBusy(false)}
  }
  async function send() {
    if(!found||busy)return
    setBusy(true)
    try{await sendFriendRequest(found.friend_code);toast.success('친구 요청을 보냈어요.');setFound(null);setSearched(false);setTab('requests');await refresh()}
    catch(cause){toast.error(socialErrorMessage(cause))}finally{setBusy(false)}
  }
  return <section className="space-y-6 py-6">
    <div className="flex items-center justify-between gap-3 border-y py-3"><div><p className="text-xs text-muted-foreground">내 친구 코드</p><p className="mt-1 font-mono text-sm tracking-widest">{profile?.friend_code??'준비 중…'}</p></div><Button variant="ghost" size="icon" aria-label="내 친구 코드 복사" className="min-h-11 min-w-11" disabled={!profile} onClick={async()=>{try{await navigator.clipboard.writeText(profile!.friend_code);toast.success('친구 코드를 복사했어요.')}catch{toast.info('친구 코드를 길게 눌러 복사해주세요.')}}}><Copy className="size-4"/></Button></div>
    <div role="group" aria-label="등대 메뉴" className="flex gap-1 rounded-xl bg-muted/60 p-1">{([{key:'friends',label:`친구 ${friends.length}`},{key:'requests',label:`요청 ${incoming.length+outgoing.length}`},{key:'invite',label:'친구 찾기'}] as const).map(item=><Button key={item.key} variant="ghost" aria-pressed={tab===item.key} onClick={()=>setTab(item.key)} className={`min-h-11 flex-1 rounded-lg text-sm ${tab===item.key?'bg-background shadow-sm':''}`}>{item.label}</Button>)}</div>
    {loading && <p role="status" className="py-6 text-sm text-muted-foreground">등대의 소식을 불러오는 중…</p>}
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>다시 불러오기</Button></div>}
    {tab==='friends' && <div><ul className="divide-y">{friends.map(request=>{const friend=request.sender_id===session?.user.id?request.recipient:request.sender;return <li key={request.id} className="flex items-center justify-between gap-2 py-4"><div className="flex min-w-0 items-center gap-3"><PlayerAvatar nickname={friend?.nickname} path={friend?.avatar_path} className="size-10"/><p className="truncate text-sm font-medium">{friend?.nickname??'친구'}</p></div><RemoveFriendButton requestId={request.id} nickname={friend?.nickname??'친구'}/></li>})}</ul>{!loading&&!error&&!friends.length&&<div className="space-y-3 py-10 text-center"><p className="text-sm text-muted-foreground">아직 함께하는 친구가 없어요.</p><Button variant="outline" className="min-h-11" onClick={()=>setTab('invite')}>첫 친구 만나기</Button></div>}</div>}
    {tab==='requests' && <div className="space-y-7"><section><h2 className="text-sm font-semibold">받은 요청 {incoming.length}</h2><ul className="mt-2 divide-y">{incoming.map(request=><li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="flex items-center gap-3"><PlayerAvatar nickname={request.sender?.nickname} path={request.sender?.avatar_path}/><p className="text-sm">{request.sender?.nickname??'친구'}</p></div><RequestActions request={request}/></li>)}</ul>{!incoming.length&&<p className="py-5 text-sm text-muted-foreground">받은 요청이 없어요.</p>}</section><section><h2 className="text-sm font-semibold">보낸 요청 {outgoing.length}</h2><ul className="mt-2 divide-y">{outgoing.map(request=><li key={request.id} className="flex items-center justify-between gap-3 py-4"><div className="flex items-center gap-3"><PlayerAvatar nickname={request.recipient?.nickname} path={request.recipient?.avatar_path}/><p className="text-sm">{request.recipient?.nickname??'친구'}</p></div><RequestActions request={request}/></li>)}</ul>{!outgoing.length&&<p className="py-5 text-sm text-muted-foreground">보낸 요청이 없어요.</p>}</section></div>}
    {tab==='invite' && <form onSubmit={search} className="space-y-4"><Label htmlFor="friend-code">친구 코드로 찾기</Label><div className="flex gap-2"><Input id="friend-code" value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setFound(null);setSearched(false);setSearchError('')}} maxLength={12} autoComplete="off" autoCapitalize="characters" placeholder="친구 코드 12자리" disabled={busy||!profile} required className="min-h-12"/><Button type="submit" disabled={busy||!profile} className="min-h-12">찾기</Button></div>{searchError&&<p role="alert" className="text-sm text-destructive">{searchError}</p>}{searched&&!found&&<p role="status" className="py-4 text-sm text-muted-foreground">해당 코드를 가진 친구가 없어요.</p>}{found&&<div className="flex items-center justify-between gap-2 border-y py-4"><div className="flex items-center gap-3"><PlayerAvatar nickname={found.nickname} path={found.avatar_path}/><p className="text-sm">{found.nickname}</p></div><Button disabled={busy||found.id===session?.user.id||Boolean(related)} onClick={()=>void send()} className="min-h-11">{found.id===session?.user.id?'나예요':related?.status==='accepted'?'이미 친구예요':related?'요청 중':'친구 요청'}</Button></div>}</form>}
  </section>
}
