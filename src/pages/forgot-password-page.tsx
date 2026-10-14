import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { emailRedirect } from '@/lib/auth-email'
import { createClient } from '@/lib/client'
import { useEmailCooldown } from '@/hooks/use-email-cooldown'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { seconds, start } = useEmailCooldown()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || seconds) return
    setBusy(true); setError('')
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: emailRedirect('recovery') })
      if (error) throw error
      setSent(true); start()
    } catch { setError('메일을 요청하지 못했어요. 잠시 후 다시 시도해주세요.'); start() }
    finally { setBusy(false) }
  }
  return <section className="flex flex-1 flex-col justify-center gap-6 py-10">
    <h1 className="text-2xl font-bold">비밀번호를 잊으셨나요?</h1>
    <p className="text-sm text-muted-foreground">가입한 이메일로 새 비밀번호를 설정할 수 있는 링크를 보내드려요.</p>
    <form onSubmit={submit} className="space-y-4">
      <Label htmlFor="recovery-email">이메일 주소</Label>
      <Input id="recovery-email" type="email" autoComplete="email" required disabled={busy} value={email} onChange={e => setEmail(e.target.value)} className="min-h-12 text-base" />
      {sent && <p role="status" className="text-sm text-primary">입력한 주소로 가입된 계정이 있다면 재설정 메일이 발송됩니다. 스팸함도 확인하고, 요청한 브라우저에서 링크를 열어주세요.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || seconds > 0} className="min-h-12 w-full">{busy ? '요청 중…' : seconds ? `${seconds}초 후 다시 요청` : sent ? '메일 다시 보내기' : '재설정 메일 보내기'}</Button>
    </form>
    <details className="rounded-xl border p-4 text-sm"><summary className="cursor-pointer font-medium">이메일 주소도 기억나지 않나요?</summary><p className="mt-3 leading-6 text-muted-foreground">사용하시는 메일함에서 ‘퐁당섬’ 가입 메일을 검색해주세요. 이메일 외의 확인 정보를 수집하지 않아 가입 이메일을 별도로 찾아드리기는 어려워요.</p></details>
    <Link to="/login" className="text-center text-sm text-primary underline">로그인으로 돌아가기</Link>
  </section>
}
