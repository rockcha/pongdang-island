import {AuthFrame} from '@/components/auth-frame'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getNickname, useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/client'

export function NicknamePage({onSaved}:{onSaved?:()=>void} = {}) {
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
      if(onSaved)onSaved();else navigate('/aquarium', { replace: true })
    } catch (cause) { setError(cause instanceof Error ? cause.message : '닉네임을 저장하지 못했어요.') }
    finally { setBusy(false) }
  }
  const form=<form onSubmit={submit} className={onSaved?"flex min-h-0 flex-1 flex-col":"auth-form"}><div className={onSaved?"min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pt-1 pb-5":"auth-field"}>
      <Label htmlFor="nickname" className={onSaved?"sr-only":""}>퐁당섬 닉네임</Label>
      <Input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} minLength={2} maxLength={12} required autoComplete="nickname" disabled={busy} className="min-h-12 text-base" />
      <p className="text-xs text-muted-foreground">한글, 영문, 숫자, 밑줄 2~12자. 나중에 바꿀 수 있어요.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div><div className={onSaved?"-mx-4 shrink-0 border-t bg-primary pb-[env(safe-area-inset-bottom)]":""}><Button type="submit" disabled={busy} className={onSaved?"h-16 w-full rounded-none text-base":"min-h-12 w-full rounded-xl"}>{busy ? '저장 중…' : '이 이름으로 시작하기'}</Button></div>
    </form>
  return onSaved?<section className="flex min-h-0 flex-1 flex-col">{form}</section>:<AuthFrame title="어떻게 불러드릴까요?" description="섬에서 사용할 이름을 알려주세요.">{form}</AuthFrame>
}
