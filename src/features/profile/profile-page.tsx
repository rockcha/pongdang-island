import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router'
import { Camera, ImagePlus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getNickname, useAuth } from '@/components/auth-provider'
import { useSocial } from '@/features/social/social-provider'
import { PlayerAvatar } from './player-avatar'
import { prepareAvatar, saveAvatar } from './avatar-api'
import { createClient } from '@/lib/client'

export function ProfilePage() {
  const { session } = useAuth()
  const { profile, loading, error, refresh } = useSocial()
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
  async function commit(remove = false) {
    if (!session || !profile || busy || (!remove && !blob)) return
    setBusy(true); setMessage('')
    try {
      await saveAvatar(session.user.id,remove ? null : blob,profile.avatar_path)
      await refresh(); setBlob(null)
      toast.success(remove ? '기본 아바타로 바꿨어요.' : '아바타를 저장했어요!')
    } catch(cause) { setMessage(cause instanceof Error ? cause.message : '아바타를 저장하지 못했어요.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-6 py-6">
    <div><h1 className="text-2xl font-bold">마이페이지</h1><p className="mt-2 text-sm text-muted-foreground">친구들에게 보여줄 나만의 모습을 골라보세요.</p></div>
    <Card><CardHeader><CardTitle>나의 아바타</CardTitle><CardDescription>친구들에게 표시되는 공개 프로필 이미지예요.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-5"><div className="relative"><PlayerAvatar nickname={nickname} path={profile?.avatar_path} preview={preview} className="size-28 ring-4 ring-primary/10" /><span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card"><Camera className="size-4" /></span></div><p className="text-lg font-semibold">{nickname}</p></div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="아바타 이미지 선택" disabled={busy || !profile} onChange={event => void select(event)} />
        <Button variant="outline" className="min-h-12 w-full" disabled={busy || !profile} onClick={() => input.current?.click()}><ImagePlus /> 이미지 선택</Button>
        <p className="text-xs leading-6 text-muted-foreground">JPG, PNG, WebP · 최대 5MB<br />중앙을 정사각형으로 맞춰 원형 아바타로 표시해요.</p>
        {preview && <div className="flex gap-2"><Button className="min-h-12 flex-1" disabled={busy} onClick={() => void commit()}>아바타 저장</Button><Button variant="outline" className="min-h-12" disabled={busy} onClick={() => setBlob(null)}>취소</Button></div>}
        {profile?.avatar_path && <Button variant="ghost" className="min-h-11 w-full" disabled={busy} onClick={() => void commit(true)}><RotateCcw /> 기본 아바타로 되돌리기</Button>}
        {busy && <p role="status" className="text-sm text-primary">이미지를 처리하고 있어요…</p>}
        {loading && <p role="status" className="text-sm">프로필을 불러오는 중…</p>}
        {(message || error) && <p role="alert" className="text-sm text-destructive">{message || error}</p>}
      </CardContent>
    </Card>
    <Link to="/nickname" className={buttonVariants({variant:'outline',className:'min-h-12 w-full'})}>닉네임 바꾸기</Link>
    <Button variant="ghost" className="min-h-12 w-full" disabled={busy} onClick={async () => {
      const { error } = await createClient().auth.signOut({scope:'local'})
      if (error) toast.error('로그아웃에 실패했어요. 다시 시도해주세요.')
    }}>로그아웃</Button>
  </section>
}
