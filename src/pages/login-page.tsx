import { BrandMascot } from '@/components/brand-mascot'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { getNickname, useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/client'
import { getLoginPreference, saveLoginPreference } from '@/lib/auth-storage'
import { validateEmail, checkEmailDomain } from '@/lib/email-validation'
import { authErrorMessage } from '@/lib/auth-errors'

export function LoginPage() {
  const { session, loading, recovery } = useAuth()
  const [preference] = useState(getLoginPreference)
  const [email, setEmail] = useState(preference.email)
  const [remember, setRemember] = useState(preference.remember)
  const [password, setPassword] = useState('')
  const [signup, setSignup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const [notice, setNotice] = useState(params.has('passwordReset') ? '비밀번호를 변경했어요. 새 비밀번호로 로그인해주세요.' : '')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const normalized = email.trim()
    const validationError = validateEmail(normalized)
    if (validationError) { setError(validationError); return }
    if (signup && password.length < 8) { setError('비밀번호는 8자 이상 입력해주세요.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      if (signup) {
        const domainStatus = await checkEmailDomain(normalized)
        if (domainStatus === 'invalid') {
          setError('이메일 도메인이 없거나 메일을 받을 수 없는 주소예요. 오타가 없는지 확인해주세요.')
          return
        }
      }
      saveLoginPreference(normalized, remember)
      const auth = createClient().auth
      if (signup) {
        const { data, error } = await auth.signUp({ email: normalized, password })
        if (error) throw error
        if (!data.session) {
          setNotice('가입 후 바로 로그인할 수 없는 상태예요. 관리자에게 문의해주세요.')
          setPassword('')
          return
        }
        toast.success('가입됐어요! 사용할 닉네임을 정해주세요.')
      } else {
        const { error } = await auth.signInWithPassword({ email: normalized, password })
        if (error) throw error
        toast.success('퐁당섬에 돌아오셨군요!')
      }
    } catch (cause) { setError(authErrorMessage(cause)) }
    finally { setBusy(false) }
  }

  if (loading) return <p role="status" className="py-16 text-center">잠시만 기다려주세요…</p>
  if (session && !busy) return <Navigate to={recovery ? '/reset-password' : getNickname(session) ? '/' : '/nickname'} replace />
  return (
    <section className="flex flex-1 flex-col justify-center gap-6 py-8">
      <BrandMascot priority className="mx-auto h-auto w-40 drop-shadow-sm" />
      <div className="text-center"><h1 className="text-2xl font-bold">퐁당섬으로 떠나요</h1><p className="mt-2 text-sm text-muted-foreground">로그인하고 나만의 낚시 여행을 시작하세요.</p></div>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">{signup ? '이메일로 회원가입' : '이메일로 로그인'}</h2>
        {signup && <p className="text-sm text-muted-foreground">이메일과 비밀번호만 입력하면 바로 시작할 수 있어요.</p>}
        <div className="space-y-2"><Label htmlFor="email">이메일</Label><Input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} className="min-h-12 text-base" />{signup && <p className="text-xs text-muted-foreground">비밀번호를 찾을 때 사용할 이메일을 입력해주세요.</p>}</div>
        <div className="space-y-2"><Label htmlFor="password">비밀번호</Label><Input id="password" type="password" minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} className="min-h-12 text-base" />{signup && <p className="text-xs text-muted-foreground">8자 이상 입력해주세요.</p>}</div>
        {!signup && <div className="space-y-1"><label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={remember} onChange={e => { setRemember(e.target.checked); saveLoginPreference(email, e.target.checked) }} disabled={busy} className="size-4 accent-teal-700" />이메일 및 로그인 상태 기억하기</label><p className="text-xs leading-5 text-muted-foreground">비밀번호 저장은 브라우저의 비밀번호 관리자를 이용해주세요.</p></div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
        <Button type="submit" className="min-h-12 w-full" disabled={busy}>{busy ? '처리 중…' : signup ? '회원가입' : '로그인'}</Button>
        {!signup && <Link to="/forgot-password" className="block py-2 text-center text-sm text-muted-foreground underline">이메일 / 비밀번호를 잊으셨나요?</Link>}
        <Button type="button" variant="ghost" className="min-h-11 w-full" disabled={busy} onClick={() => { setSignup(!signup); setError(''); setNotice(''); setPassword('') }}>{signup ? '이미 계정이 있나요? 로그인' : '처음 오셨나요? 회원가입'}</Button>
      </form>
    </section>
  )
}
