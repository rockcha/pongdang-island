import {appArt} from '@/components/app-art'
import { NicknamePage } from '@/pages/nickname-page'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router'
import {Pencil,ChevronRight} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LandscapeImage } from '@/components/landscape-image'
import { loadCollection } from '@/features/collection/api'
import type { CollectionState } from '@/features/collection/api'
import { getNickname, useAuth } from '@/components/auth-provider'
import { useSocial } from '@/features/social/social-provider'
import { PlayerAvatar } from './player-avatar'
import { prepareAvatar, saveAvatar } from './avatar-api'
import { createClient } from '@/lib/client'
import {MapPieceTestControls} from '@/features/regions/map-piece-test-controls'

const {camera:Camera,logout:LogOut,collection:BookOpen,fish:Fish,mailFriend:Users}=appArt

export function ProfilePage() {
  const { session } = useAuth()
  const [nameOpen,setNameOpen]=useState(false)
  const { profile, requests, loading, error, refresh } = useSocial()
  const [stats,setStats]=useState<{discovered:number;owned:number}|null>(null)
  const [statsError,setStatsError]=useState(false)
  useEffect(()=>{let active=true;setStats(null);setStatsError(false);void loadCollection().then(data=>{if(active){const collection=data as unknown as CollectionState;setStats({discovered:collection.catalog.filter(item=>item.discovered).length,owned:collection.items.length})}}).catch(()=>{if(active)setStatsError(true)});return()=>{active=false}},[session?.user.id])
  const [blob,setBlob] = useState<Blob | null>(null)
  const [preview,setPreview] = useState<string>()
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const selection = useRef(0)
  const nickname = getNickname(session)
  useEffect(() => {
    if (!blob) { setPreview(undefined); return }
    const url = URL.createObjectURL(blob); setPreview(url)
    return () => URL.revokeObjectURL(url)
  },[blob])
  useEffect(() => () => { selection.current++ }, [])
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const version = ++selection.current
    setBusy(true); setMessage('')
    try { const image = await prepareAvatar(file); if (version === selection.current) setBlob(image) }
    catch (cause) { if (version === selection.current) setMessage(cause instanceof Error ? cause.message : '이미지를 열지 못했어요.') }
    finally { if (version === selection.current) setBusy(false) }
  }
  async function commit() {
    if (!session || !profile || busy || !blob) return
    setBusy(true); setMessage('')
    try {
      await saveAvatar(session.user.id,blob,profile.avatar_path)
      await refresh(); setBlob(null)
      toast.success('아바타를 저장했어요!')
    } catch(cause) { setMessage(cause instanceof Error ? cause.message : '아바타를 저장하지 못했어요.') }
    finally { setBusy(false) }
  }
  return <section className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="relative isolate px-4 pb-5 pt-6 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 overflow-hidden bg-secondary"><LandscapeImage retryable={false} src="/banners/profile-menu.png" alt="" className="absolute inset-0 size-full object-cover opacity-30"/><div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background"/></div>
        <button type="button" aria-label="아바타 편집" disabled={busy||!profile} onClick={()=>input.current?.click()} className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><PlayerAvatar nickname={nickname} path={profile?.avatar_path} preview={preview} className="size-24 ring-4 ring-background"/><span className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full bg-background text-primary ring-2 ring-background"><Camera className="size-7"/></span></button>
        <div className="mt-3 flex items-center justify-center gap-1"><p className="text-lg font-medium">{nickname}</p><button type="button" onClick={()=>setNameOpen(true)} aria-label="이름 바꾸기" className="grid size-9 place-items-center rounded-full text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="size-3.5"/></button></div>
        <Link to="/titles" className="mx-auto mt-1 inline-flex min-h-11 items-center gap-2 px-3 text-xs text-primary"><appArt.title className="size-6"/>{profile?.equipped_title||'칭호 선택하기'}<ChevronRight className="size-3.5"/></Link>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="아바타 이미지 선택" disabled={busy||!profile} onChange={event=>void select(event)}/>
      <div className="grid grid-cols-3 divide-x border-y" aria-label="나의 활동">{[{label:'발견한 개체',value:stats?.discovered,icon:BookOpen,to:'/collection'},{label:'보유 개체',value:stats?.owned,icon:Fish,to:'/aquarium'},{label:'친구',value:loading?undefined:requests.filter(item=>item.status==='accepted').length,icon:Users,to:'/friends'}].map(item=><Link key={item.label} to={item.to} className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-1 py-3 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><item.icon className="mb-1 size-8 text-primary"/><span className="text-base tabular-nums">{item.value??(statsError?'—':'…')}</span><span className="text-[11px] text-muted-foreground">{item.label}</span></Link>)}</div>
      <div className="border-b"><button className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50" disabled={busy} onClick={async()=>{setBusy(true);try{const {error}=await createClient().auth.signOut({scope:'local'});if(error)throw error}catch{toast.error('로그아웃에 실패했어요. 다시 시도해주세요.')}finally{setBusy(false)}}}><LogOut className="size-7"/>로그아웃</button></div>
      {session?.user.email?.toLowerCase()==='1@1.com'&&<MapPieceTestControls key={session.user.id} userId={session.user.id}/>}
      {(busy||loading)&&<p role="status" className="px-4 py-3 text-xs text-muted-foreground">{busy?'변경 사항을 처리하고 있어요…':'프로필을 불러오는 중…'}</p>}
      {(message||error)&&<p role="alert" className="px-4 py-3 text-sm text-destructive">{message||error}</p>}
    </div>
    {blob&&<div className="flex shrink-0 border-t bg-primary pb-[env(safe-area-inset-bottom)]"><Button variant="secondary" className="h-16 flex-1 rounded-none" disabled={busy} onClick={()=>{setBlob(null);setMessage('')}}>취소</Button><Button className="h-16 flex-1 rounded-none text-base" disabled={busy||!blob||!profile} onClick={()=>void commit()}>변경 사항 저장</Button></div>}
    <Dialog open={nameOpen} onOpenChange={setNameOpen}><DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[88dvh] max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl rounded-b-none pb-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"><DialogHeader className="shrink-0 pr-7"><DialogTitle className="flex items-center gap-2"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="size-6 shrink-0 object-contain"/>이름 바꾸기</DialogTitle><DialogDescription>어떻게 불러드릴까요?</DialogDescription></DialogHeader>{nameOpen&&<NicknamePage onSaved={()=>setNameOpen(false)}/>}</DialogContent></Dialog>
  </section>
}

