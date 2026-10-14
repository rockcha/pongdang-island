import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { Session } from '@supabase/supabase-js'
import { useAuth } from '@/components/auth-provider'
import { ResetPasswordPage } from '@/pages/reset-password-page'

const { updateUser, signOut } = vi.hoisted(() => ({ updateUser: vi.fn(), signOut: vi.fn() }))
vi.mock('@/components/auth-provider', () => ({ useAuth: vi.fn() }))
vi.mock('@/lib/client', () => ({ createClient: () => ({ auth: { updateUser, signOut } }) }))
afterEach(cleanup)

function renderPage(recovery: boolean) {
  vi.mocked(useAuth).mockReturnValue({ session: { user: { id: 'user' } } as Session, loading: false, error: null, recovery })
  render(<MemoryRouter initialEntries={['/reset-password']}><Routes><Route path="/reset-password" element={<ResetPasswordPage />} /><Route path="/login" element={<p>로그인 화면</p>} /></Routes></MemoryRouter>)
}
describe('password reset page', () => {
  it('requires a recovery session, even when already logged in', () => {
    renderPage(false)
    expect(screen.queryByLabelText('새 비밀번호')).toBeNull()
    expect(screen.getByText('재설정 링크가 필요해요')).toBeTruthy()
  })
  it('rejects mismatched passwords before sending a request', async () => {
    renderPage(true)
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'new-pass-123' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'different-123' } })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경하기' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '비밀번호가 서로 달라요. 다시 확인해주세요.')
    expect(updateUser).not.toHaveBeenCalled()
  })
  it('updates password, signs out, then redirects to login', async () => {
    updateUser.mockResolvedValue({ error: null }); signOut.mockResolvedValue({ error: null })
    renderPage(true)
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'new-pass-123' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'new-pass-123' } })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경하기' }))
    await waitFor(() => expect(screen.getByText('로그인 화면')).toBeTruthy())
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-pass-123' })
    expect(signOut).toHaveBeenCalledWith({ scope: 'global' })
  })
})
