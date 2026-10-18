import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { SettingsPage } from '@/pages/settings-page'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})
const mount = () => render(<ThemeProvider><MemoryRouter><SettingsPage /></MemoryRouter></ThemeProvider>)

it('switches the page and native controls, persists the choice, and restores it after reopening', () => {
  const page = mount()
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
  fireEvent.click(screen.getByRole('switch'))
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(document.documentElement.style.colorScheme).toBe('dark')
  expect(localStorage.getItem('pongdang:theme')).toBe('dark')
  page.unmount()
  mount()
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  fireEvent.click(screen.getByRole('switch'))
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  expect(document.documentElement.style.colorScheme).toBe('only light')
})

it('still changes the theme and explains when browser storage is unavailable', () => {
  mount()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  fireEvent.click(screen.getByRole('switch'))
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(screen.getByRole('alert').textContent).toContain('저장하지 못했어요')
})
