import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { completeEmailLink } from '@/lib/auth-email'
import { createClient } from '@/lib/client'

// React StrictMode may mount the effect twice. Exchange each single-use token only once.
let pending: { href: string; task: ReturnType<typeof completeEmailLink> } | undefined

export function EmailConfirmPage() {
  const incoming = useRef(new URL(window.location.href))
  const navigate = useNavigate()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const url = incoming.current
    if (pending?.href !== url.href) pending = { href: url.href, task: completeEmailLink(url, createClient()) }
    void pending.task.then(() => {
      if (active) navigate('/reset-password', { replace: true })
    }).catch(cause => {
      if (active) {
        setError(cause instanceof Error ? cause.message : '인증에 실패했어요. 메일을 다시 요청해주세요.')
        window.history.replaceState(window.history.state, '', '/auth/confirm')
      }
    })
    return () => { active = false }
  }, [navigate])
  return <section className="flex flex-1 flex-col justify-center gap-5 py-10 text-center">
    <h1 className="text-2xl font-bold">비밀번호 재설정</h1>
    {error ? <><p role="alert" className="text-sm text-destructive">{error}</p><Link className="text-primary underline" to="/forgot-password">비밀번호 재설정 메일 다시 받기</Link><Link className="text-primary underline" to="/login">로그인으로 돌아가기</Link></> : <p role="status">재설정 링크를 확인하고 있어요…</p>}
  </section>
}
