export const AUTH_STORAGE_KEY = 'pongdang.auth'
export const REMEMBER_KEY = 'pongdang.remember-login'
export const EMAIL_KEY = 'pongdang.remembered-email'
export const RECOVERY_KEY = 'pongdang.password-recovery'
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

// Never stores passwords. PKCE verifiers are shared for email links opened in another tab.
export function createAuthStorage(local: Store, tab: Store) {
  const target = (key: string) => key.endsWith('-code-verifier') || local.getItem(REMEMBER_KEY) === 'true' ? local : tab
  return {
    getItem(key: string) { return target(key).getItem(key) },
    setItem(key: string, value: string) {
      const destination = target(key)
      destination.setItem(key, value)
      const other = destination === local ? tab : local
      other.removeItem(key)
    },
    removeItem(key: string) { local.removeItem(key); tab.removeItem(key) },
  }
}
export function saveLoginPreference(email: string, remember: boolean) {
  const storage = createAuthStorage(localStorage, sessionStorage)
  const session = storage.getItem(AUTH_STORAGE_KEY)
  localStorage.setItem(REMEMBER_KEY, String(remember))
  if (remember) localStorage.setItem(EMAIL_KEY, email.trim())
  else localStorage.removeItem(EMAIL_KEY)
  if (session) storage.setItem(AUTH_STORAGE_KEY, session)
}
export function getLoginPreference() {
  return { remember: localStorage.getItem(REMEMBER_KEY) === 'true', email: localStorage.getItem(EMAIL_KEY) ?? '' }
}
