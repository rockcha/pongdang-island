import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { completeEmailLink } from '@/lib/auth-email'

function mockClient() {
  const auth = {
    initialize: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }
  return { auth, client: { auth } as unknown as SupabaseClient }
}
describe('password recovery email', () => {
  it('rejects signup confirmation links because signup no longer requires email verification', async () => {
    const { auth, client } = mockClient()
    await expect(completeEmailLink(new URL('https://island.test/auth/confirm?type=signup&token_hash=token'), client)).rejects.toThrow('올바르지')
    expect(auth.verifyOtp).not.toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
  })
  it('preserves recovery session for password update', async () => {
    const { auth, client } = mockClient()
    await expect(completeEmailLink(new URL('https://island.test/auth/confirm?type=recovery&token_hash=token'), client)).resolves.toBe('recovery')
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'token', type: 'recovery' })
    expect(auth.signOut).not.toHaveBeenCalled()
  })
  it('waits for SDK PKCE exchange when using default mail templates', async () => {
    const { auth, client } = mockClient()
    await expect(completeEmailLink(new URL('https://island.test/auth/confirm?type=recovery&code=code'), client)).resolves.toBe('recovery')
    expect(auth.initialize).toHaveBeenCalledOnce()
  })
  it('does not treat an existing session as proof of a valid email link', async () => {
    const { auth, client } = mockClient()
    await expect(completeEmailLink(new URL('https://island.test/auth/confirm?type=recovery'), client)).rejects.toThrow('인증 링크')
    expect(auth.getSession).not.toHaveBeenCalled()
  })
  it('rejects expired tokens without falling back to an existing session', async () => {
    const { auth, client } = mockClient()
    auth.verifyOtp.mockResolvedValue({ error: new Error('expired') })
    await expect(completeEmailLink(new URL('https://island.test/auth/confirm?type=recovery&token_hash=old'), client)).rejects.toThrow('만료')
    expect(auth.getSession).not.toHaveBeenCalled()
  })
  it('rejects redirect errors and unknown OTP types', async () => {
    const { client } = mockClient()
    await expect(completeEmailLink(new URL('https://island.test/auth/confirm?type=recovery&error=expired'), client)).rejects.toThrow('만료')
    await expect(completeEmailLink(new URL('https://island.test/auth/confirm?type=invite&token_hash=token'), client)).rejects.toThrow('올바르지')
  })
})
