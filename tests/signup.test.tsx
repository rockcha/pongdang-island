import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { Session } from '@supabase/supabase-js'
import { LoginPage } from '@/pages/login-page'
import { useAuth } from '@/components/auth-provider'
import { checkEmailDomain } from '@/lib/email-validation'

const { signUp, signOut } = vi.hoisted(() => ({ signUp: vi.fn(), signOut: vi.fn() }))
vi.mock('@/lib/client', () => ({ createClient: () => ({ auth: { signUp, signOut } }) }))
vi.mock('@/components/auth-provider', () => ({ useAuth: vi.fn(), getNickname: () => '' }))
vi.mock('@/lib/email-validation', async original => ({ ...await original<typeof import('@/lib/email-validation')>(), checkEmailDomain: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear()
  vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, error: null, recovery: false })
  vi.mocked(checkEmailDomain).mockResolvedValue('receivable')
})
afterEach(cleanup)
function signupForm() {
  render(<MemoryRouter><Routes><Route path="/" element={<LoginPage />} /><Route path="/nickname" element={<p>닉네임 설정 화면</p>} /></Routes></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: '처음 오셨나요? 회원가입' }))
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'fisher@example.com' } })
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'safe-pass-123' } })
}
describe('signup without email confirmation', () => {
  it('signs up without email options, keeps the session and redirects to nickname setup', async () => {
    signUp.mockImplementation(async () => {
      vi.mocked(useAuth).mockReturnValue({ session: { user: { id: 'user' } } as Session, loading: false, error: null, recovery: false })
      return { data: { session: { user: { id: 'user' } } }, error: null }
    })
    signupForm()
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }))
    expect(await screen.findByText('닉네임 설정 화면')).toBeTruthy()
    expect(signUp).toHaveBeenCalledWith({ email: 'fisher@example.com', password: 'safe-pass-123' })
    expect(signOut).not.toHaveBeenCalled()
  })
  it('blocks signup for an invalid email domain', async () => {
    vi.mocked(checkEmailDomain).mockResolvedValue('invalid')
    signupForm()
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }))
    expect((await screen.findByRole('alert')).textContent).toContain('도메인')
    expect(signUp).not.toHaveBeenCalled()
  })
  it('continues when domain lookup is unavailable and handles no-session responses honestly', async () => {
    vi.mocked(checkEmailDomain).mockResolvedValue('unknown')
    signUp.mockResolvedValue({ data: { session: null }, error: null })
    signupForm()
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }))
    expect((await screen.findByRole('status')).textContent).toContain('바로 로그인할 수 없는')
    expect(signUp).toHaveBeenCalledOnce()
    expect(screen.queryByText('가입 인증 메일 다시 받기')).toBeNull()
  })
})
