import { beforeEach, describe, expect, it } from 'vitest'
import { AUTH_STORAGE_KEY, EMAIL_KEY, REMEMBER_KEY, createAuthStorage, saveLoginPreference } from '@/lib/auth-storage'

beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
describe('login persistence', () => {
  it('keeps unchecked sessions in the current tab only', () => {
    const storage = createAuthStorage(localStorage, sessionStorage)
    storage.setItem(AUTH_STORAGE_KEY, 'session')
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBe('session')
  })
  it('remembers email and moves the session to persistent storage when checked', () => {
    const storage = createAuthStorage(localStorage, sessionStorage)
    storage.setItem(AUTH_STORAGE_KEY, 'session')
    saveLoginPreference(' fisher@example.com ', true)
    expect(localStorage.getItem(EMAIL_KEY)).toBe('fisher@example.com')
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe('session')
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })
  it('removes persistent session and email when unchecked', () => {
    localStorage.setItem(REMEMBER_KEY, 'true')
    localStorage.setItem(AUTH_STORAGE_KEY, 'session')
    saveLoginPreference('fisher@example.com', false)
    expect(localStorage.getItem(EMAIL_KEY)).toBeNull()
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBe('session')
  })
  it('keeps PKCE verifiers available across email tabs and clears both stores on logout', () => {
    const storage = createAuthStorage(localStorage, sessionStorage)
    const key = `${AUTH_STORAGE_KEY}-code-verifier`
    storage.setItem(key, 'verifier')
    expect(localStorage.getItem(key)).toBe('verifier')
    storage.removeItem(key)
    expect(localStorage.getItem(key)).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })
})
