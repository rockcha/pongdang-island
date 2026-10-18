import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
const key = 'pongdang:theme'
function readTheme(): Theme {
  try { return localStorage.getItem(key) === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}
const ThemeContext = createContext({ theme: 'light' as Theme, setTheme: (_value: Theme): boolean => false })
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, update] = useState<Theme>(readTheme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'only light'
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme === 'dark' ? 'dark' : 'only light')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#241c17' : '#fff8ee')
  }, [theme])
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) update(readTheme()) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  function setTheme(value: Theme) {
    update(value)
    try { localStorage.setItem(key, value); return true } catch { return false }
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export const useAppTheme = () => useContext(ThemeContext)
