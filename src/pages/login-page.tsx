import {AuthFrame} from '@/components/auth-frame'
import {Eye,EyeOff} from 'lucide-react'
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
  const [showPassword,setShowPassword]=useState(false)
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
  if (session && !busy) return <Navigate to={recovery ? '/reset-password' : getNickname(session) ? '/aquarium' : '/nickname'} replace />
  return <AuthFrame title={signup?'섬에서의 첫 하루':'다시 만나 반가워요'} description={signup?'계정을 만들고 나만의 낚시 여행을 시작해요.':'오늘도 퐁당섬에서 잠깐 쉬어가요.'}>
   <form onSubmit={submit} className="auth-form" aria-label={signup?'회원가입':'로그인'}>
    <div className="auth-field"><Label htmlFor="email">이메일</Label><Input id="email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy} placeholder="hello@example.com"/></div>
    <div className="auth-field"><Label htmlFor="password">비밀번호</Label><div className="relative"><Input id="password" type={showPassword?'text':'password'} minLength={signup?8:undefined} autoComplete={signup?'new-password':'current-password'} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy} className="auth-password-input" aria-describedby={signup?'password-hint':undefined} placeholder={signup?'8자 이상 입력해주세요':'비밀번호를 입력해주세요'}/><button type="button" aria-label={showPassword?'비밀번호 숨기기':'비밀번호 보기'} aria-pressed={showPassword} aria-controls="password" disabled={busy} onClick={()=>setShowPassword(value=>!value)} className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-lg text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">{showPassword?<EyeOff className="size-[18px]"/>:<Eye className="size-[18px]"/>}</button></div>{signup&&<p id="password-hint" className="text-[11px] leading-4 text-muted-foreground">비밀번호는 8자 이상으로 설정해주세요.</p>}</div>
    {!signup&&<div className="flex min-h-10 items-center justify-between gap-2 text-xs text-muted-foreground"><label className="flex min-h-10 cursor-pointer items-center gap-2" title="이메일과 로그인 상태를 기억해요"><input type="checkbox" checked={remember} onChange={e=>{setRemember(e.target.checked);saveLoginPreference(email,e.target.checked)}} disabled={busy} className="size-4 accent-primary"/>로그인 유지</label><Link to="/forgot-password" className="inline-flex min-h-10 items-center rounded px-1 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">비밀번호 찾기</Link></div>}
    {error&&<p role="alert" className="auth-feedback bg-destructive/5 text-destructive">{error}</p>}
    {notice&&<p role="status" className="auth-feedback bg-secondary/70 text-primary">{notice}</p>}
    <Button type="submit" className="min-h-12 w-full rounded-xl text-sm" disabled={busy} aria-busy={busy}>{busy?'처리 중…':signup?'회원가입':'로그인'}</Button>
   </form>
   <Button type="button" variant="ghost" className="auth-switch rounded-xl" disabled={busy} onClick={()=>{setSignup(!signup);setError('');setNotice('');setPassword('');setShowPassword(false)}}>{signup?'이미 계정이 있나요? 로그인':'처음 오셨나요? 회원가입'}</Button>
  </AuthFrame>
}
