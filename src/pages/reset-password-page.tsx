import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/client'

export function ResetPasswordPage() {
  const { session, loading, recovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !recovery || busy) return
    if (password !== confirm) { setError('비밀번호가 서로 달라요. 다시 확인해주세요.'); return }
    setBusy(true); setError('')
    try {
      const auth = createClient().auth
      if (!updated) {
        const { error } = await auth.updateUser({ password })
        if (error) throw error
        setUpdated(true); setPassword(''); setConfirm('')
      }
      const { error } = await auth.signOut({ scope: 'global' })
      if (error) { setError('비밀번호는 변경됐어요. 로그인 화면으로 이동하려면 다시 시도해주세요.'); return }
      navigate('/login?passwordReset=1', { replace: true })
    } catch (cause) {
      const code = (cause as { code?: string }).code
      setError(code === 'same_password' ? '기존 비밀번호와 다른 비밀번호를 입력해주세요.' : code === 'weak_password' ? '더 안전한 비밀번호를 입력해주세요.' : '비밀번호 변경에 실패했어요. 링크가 만료됐다면 메일을 다시 요청해주세요.')
    } finally { setBusy(false) }
  }
  if (loading) return <p role="status" className="py-16 text-center">인증 확인 중…</p>
  if (!session || !recovery) return <section className="space-y-5 py-12"><h1 className="text-xl font-bold">재설정 링크가 필요해요</h1><p>이메일의 비밀번호 재설정 링크로 접속해주세요. 링크가 만료됐다면 다시 요청할 수 있어요.</p><Link to="/forgot-password" className="text-primary underline">재설정 메일 받기</Link></section>
  return <section className="flex flex-1 flex-col justify-center gap-6 py-10">
    <h1 className="text-2xl font-bold">새 비밀번호 설정</h1>
    <p className="text-sm text-muted-foreground">변경 후에는 새 비밀번호로 다시 로그인해주세요.</p>
    <form onSubmit={submit} className="space-y-4">
      {!updated && <><Label htmlFor="new-password">새 비밀번호</Label><Input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} className="min-h-12 text-base" /><Label htmlFor="confirm-password">새 비밀번호 확인</Label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} className="min-h-12 text-base" /><p className="text-xs text-muted-foreground">8자 이상 입력해주세요.</p></>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="min-h-12 w-full">{busy ? '처리 중…' : updated ? '로그인으로 돌아가기' : '비밀번호 변경하기'}</Button>
    </form>
  </section>
}
