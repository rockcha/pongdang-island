import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ForgotPasswordPage } from '@/pages/forgot-password-page'

const { resetPasswordForEmail } = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn() }))
vi.mock('@/lib/client', () => ({ createClient: () => ({ auth: { resetPasswordForEmail } }) }))
afterEach(cleanup)

describe('request recovery email', () => {
  it('sends the correct redirect and shows a generic message without revealing account existence', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('이메일 주소'), { target: { value: 'unknown@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정 메일 보내기' }))
    await screen.findByRole('status')
    expect(resetPasswordForEmail).toHaveBeenCalledWith('unknown@example.com', { redirectTo: `${window.location.origin}/auth/confirm?type=recovery` })
    expect(screen.getByRole('status').textContent).toContain('가입된 계정이 있다면')
    expect(screen.getByRole('button', { name: /초 후 다시 요청/ })).toHaveProperty('disabled', true)
  })
  it('shows a retry message if the mail request fails', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: new Error('rate limit') })
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('이메일 주소'), { target: { value: 'fisher@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정 메일 보내기' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('잠시 후'))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
