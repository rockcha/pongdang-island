import {AquariumIcon} from '@/components/place-icons'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Copy, TowerControl, UserPlus, Users, Inbox } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSocial } from '@/features/social/social-provider'
import { socialErrorMessage } from '@/features/social/types'
import type { Profile } from '@/features/social/types'
import { findPlayer, sendFriendRequest } from './api'
import { RequestActions } from './request-actions'
import { RemoveFriendButton } from './remove-friend-button'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import {Link} from 'react-router'

type Tab='friends'|'requests'
export function FriendsPage() {
  const {session}=useAuth()
  const {profile,requests,loading,error,refresh}=useSocial()
  const [tab,setTab]=useState<Tab>('friends')
  const [inviteOpen,setInviteOpen]=useState(false)
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
    const normalized=code.replace(/\s/g,'').toUpperCase()
    if(!/^[A-F0-9]{12}$/.test(normalized)){setSearchError('친구 코드는 영문 A~F와 숫자 12자리예요.');return}
    setBusy(true);setSearchError('');setFound(null);setSearched(false)
    try{setFound(await findPlayer(normalized));setSearched(true)}catch(cause){setSearchError(socialErrorMessage(cause))}finally{setBusy(false)}
  }
  async function send() {
    if(!found||busy)return
    setBusy(true)
    try{await sendFriendRequest(found.friend_code);toast.success('친구 요청을 보냈어요.');setFound(null);setSearched(false);setTab('requests');setInviteOpen(false);await refresh()}
    catch(cause){toast.error(socialErrorMessage(cause))}finally{setBusy(false)}
  }
  return <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col bg-background text-foreground">
    <div role="group" aria-label="등대 메뉴" className="grid shrink-0 grid-cols-2 border-b border-border">{([{key:'friends',label:'친구',count:friends.length,icon:Users},{key:'requests',label:'받은 요청',count:incoming.length,icon:Inbox}] as const).map(item=><Button key={item.key} variant="ghost" aria-label={item.label+' '+item.count} aria-pressed={tab===item.key} onClick={()=>setTab(item.key)} className={`min-h-12 min-w-0 gap-2 rounded-none border-r border-border text-sm ${tab===item.key?'bg-secondary text-primary hover:bg-secondary':'text-muted-foreground'}`}><item.icon className="size-4"/>{item.label}<span className="text-xs tabular-nums opacity-70">{item.count}</span>{item.key==='requests'&&incoming.length>0&&<span aria-hidden="true" className="size-1.5 rounded-full bg-primary"/>}</Button>)}</div>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
    {loading&&!requests.length&&<div role="status" aria-label="등대의 소식을 불러오는 중"><span className="sr-only">등대의 소식을 불러오는 중…</span><div aria-hidden="true" className="space-y-3">{Array.from({length:4},(_,i)=><div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 motion-safe:animate-pulse"><div className="size-12 shrink-0 rounded-full bg-secondary"/><div className="flex-1 space-y-2"><div className="h-4 w-24 rounded bg-secondary"/><div className="h-3 w-36 max-w-full rounded bg-secondary/60"/></div><div className="size-10 rounded-lg bg-secondary/60"/></div>)}</div></div>}
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>다시 불러오기</Button></div>}
    {tab==='friends' && <div><ul className="divide-y divide-border/70">{friends.map(request=>{const friend=request.sender_id===session?.user.id?request.recipient:request.sender;return <li key={request.id} className="flex min-w-0 items-center gap-3 py-4 first:pt-1 last:pb-1"><div className="flex min-w-0 flex-1 items-center gap-3"><PlayerAvatar nickname={friend?.nickname} path={friend?.avatar_path} className="size-12 shrink-0 ring-2 ring-secondary"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{friend?.nickname??'친구'}</p><p className="mt-1 text-xs text-muted-foreground">친구의 바다를 구경해 보세요.</p></div></div><div className="flex shrink-0 items-center gap-1"><Link to={`/friends/${friend?.id??(request.sender_id===session?.user.id?request.recipient_id:request.sender_id)}/aquarium`} className={buttonVariants({variant:'ghost',size:'icon',className:'min-h-11 min-w-11 rounded-xl text-primary'})} aria-label={`${friend?.nickname??'친구'}의 아쿠아리움 방문`}><AquariumIcon className="size-5"/></Link><RemoveFriendButton requestId={request.id} nickname={friend?.nickname??'친구'}/></div></li>})}</ul>{!loading&&!error&&!friends.length&&<div className="space-y-3 rounded-3xl border border-dashed border-border px-5 py-10 text-center dark:border-border"><TowerControl aria-hidden="true" className="mx-auto mb-5 size-16 rounded-2xl bg-secondary p-3 text-primary"/><h3>첫 친구를 기다리는 등대</h3><p className="text-sm text-muted-foreground">아직 함께하는 친구가 없어요.</p><Button variant="outline" className="min-h-11" onClick={()=>setInviteOpen(true)}>첫 친구 만나기</Button></div>}</div>}
    {tab==='requests' && <div className="space-y-4"><section className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">받은 요청 {incoming.length}</h2><ul className="mt-2 divide-y">{incoming.map(request=><li key={request.id} className="flex flex-col gap-3 py-4 first:pt-3 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><PlayerAvatar nickname={request.sender?.nickname} path={request.sender?.avatar_path}/><p className="min-w-0 truncate text-sm font-medium">{request.sender?.nickname??'친구'}</p></div><RequestActions request={request}/></li>)}</ul>{!incoming.length&&<p className="py-5 text-sm text-muted-foreground">받은 요청이 없어요.</p>}</section><details className="rounded-2xl border border-border bg-card p-4 dark:border-border"><summary className="min-h-11 cursor-pointer content-center text-sm text-muted-foreground">보낸 요청 {outgoing.length}</summary><ul className="mt-2 divide-y">{outgoing.map(request=><li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="flex items-center gap-3"><PlayerAvatar nickname={request.recipient?.nickname} path={request.recipient?.avatar_path}/><p className="min-w-0 truncate text-sm font-medium">{request.recipient?.nickname??'친구'}</p></div><RequestActions request={request}/></li>)}</ul>{!outgoing.length&&<p className="py-5 text-sm text-muted-foreground">보낸 요청이 없어요.</p>}</details></div>}
    </div>
    <Button onClick={()=>setInviteOpen(true)} className="min-h-14 w-full shrink-0 gap-2 rounded-none border-t border-border pb-[env(safe-area-inset-bottom)] text-base"><UserPlus className="size-5"/>친구 초대</Button>
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent className="top-auto bottom-0 max-h-[85dvh] max-w-full translate-y-0 gap-5 overflow-y-auto rounded-t-3xl rounded-b-none p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:top-1/2 sm:bottom-auto sm:max-w-md sm:-translate-y-1/2 sm:rounded-3xl"><div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-muted sm:hidden"/><DialogHeader><DialogTitle>친구와 불빛 이어가기</DialogTitle><DialogDescription>내 코드를 나누거나 친구 코드로 찾아보세요.</DialogDescription></DialogHeader>    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/50 p-4 dark:border-border dark:bg-muted"><div><p className="text-xs text-muted-foreground">내 친구 코드</p><p className="mt-1 font-mono text-sm tracking-widest">{profile?.friend_code.match(/.{1,4}/g)?.join(' ')??'준비 중…'}</p></div><Button variant="ghost" size="icon" aria-label="내 친구 코드 복사" className="min-h-11 min-w-11" disabled={!profile} onClick={async()=>{try{await navigator.clipboard.writeText(profile!.friend_code);toast.success('친구 코드를 복사했어요.')}catch{toast.info('친구 코드를 길게 눌러 복사해주세요.')}}}><Copy className="size-4"/></Button></div>
<form onSubmit={search} className="space-y-4"><Label htmlFor="friend-code">친구 코드로 찾기</Label><div className="flex gap-2"><Input id="friend-code" value={code} onChange={e=>{setCode(e.target.value.replace(/\s/g,'').toUpperCase());setFound(null);setSearched(false);setSearchError('')}} maxLength={32} autoComplete="off" autoCapitalize="characters" placeholder="친구 코드 12자리" disabled={busy||!profile} required className="min-h-12 min-w-0 flex-1 text-base"/><Button type="submit" disabled={busy||!profile} className="min-h-12">찾기</Button></div>{searchError&&<p role="alert" className="text-sm text-destructive">{searchError}</p>}{searched&&!found&&<p role="status" className="py-4 text-sm text-muted-foreground">해당 코드를 가진 친구가 없어요.</p>}{found&&<div className="flex items-center justify-between gap-2 border-y py-4"><div className="flex items-center gap-3"><PlayerAvatar nickname={found.nickname} path={found.avatar_path}/><p className="text-sm">{found.nickname}</p></div><Button disabled={busy||found.id===session?.user.id||Boolean(related)} onClick={()=>void send()} className="min-h-11">{found.id===session?.user.id?'나예요':related?.status==='accepted'?'이미 친구예요':related?'요청 중':'친구 요청'}</Button></div>}</form></DialogContent></Dialog>
  </section>
}
