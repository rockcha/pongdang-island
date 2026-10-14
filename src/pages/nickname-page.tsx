import { BrandMascot } from '@/components/brand-mascot'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getNickname, useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/client'

export function NicknamePage() {
  const { session } = useAuth()
  const [nickname, setNickname] = useState(getNickname(session))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = nickname.trim()
    if (!/^[가-힣a-zA-Z0-9_]{2,12}$/.test(name)) { setError('한글, 영문, 숫자, 밑줄로 2~12자를 입력해주세요.'); return }
    setBusy(true); setError('')
    try {
      const { error } = await createClient().auth.updateUser({ data: { game_nickname: name } })
      if (error) throw error
      toast.success(`${name}님, 환영해요!`)
      navigate('/', { replace: true })
    } catch (cause) { setError(cause instanceof Error ? cause.message : '닉네임을 저장하지 못했어요.') }
    finally { setBusy(false) }
  }
  return <section className="flex flex-1 flex-col justify-center gap-6 py-10">
    <BrandMascot className="mx-auto h-auto w-40" />
    <h1 className="text-center text-2xl font-bold">어떻게 불러드릴까요?</h1>
    <form onSubmit={submit} className="space-y-4">
      <Label htmlFor="nickname">퐁당섬 닉네임</Label>
      <Input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} minLength={2} maxLength={12} required autoComplete="nickname" disabled={busy} className="min-h-12 text-base" />
      <p className="text-xs text-muted-foreground">한글, 영문, 숫자, 밑줄 2~12자. 나중에 바꿀 수 있어요.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="min-h-12 w-full">{busy ? '저장 중…' : '이 이름으로 시작하기'}</Button>
    </form>
  </section>
}
