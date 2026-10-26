import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'
import { FriendAquariumActions } from '@/features/friends/friend-aquarium-actions'
import type { FriendExpedition } from '@/features/expeditions/api'
const mock = vi.hoisted(() => ({
  status: {
    friends: [] as FriendExpedition[],
    now: Date.parse('2026-10-26T05:00:00Z'),
    error: false,
  },
}))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'me' } } }),
}))
vi.mock('@/features/expeditions/use-friend-expeditions', () => ({
  useFriendExpeditions: () => mock.status,
}))
beforeEach(() => {
  mock.status = { friends: [], now: Date.parse('2026-10-26T05:00:00Z'), error: false }
})
afterEach(cleanup)
const sailing: FriendExpedition = {
  friend_id: 'friend',
  expedition_id: 'trip',
  returns_at: '2026-10-26T06:00:00Z',
  boosted: false,
}
function View() {
  const location = useLocation()
  return (
    <>
      <FriendAquariumActions owner="friend" nickname="친구퐁이" />
      <output aria-label="현재 경로">{location.pathname}</output>
    </>
  )
}
it('opens the friend trap only when a running trap can still be helped', () => {
  mock.status.friends = [sailing]
  const view = render(
    <MemoryRouter>
      <View />
    </MemoryRouter>,
  )
  const button = screen.getByRole('button', { name: '통발 유인' })
  expect(button.hasAttribute('disabled')).toBe(false)
  fireEvent.click(button)
  expect(screen.getByLabelText('현재 경로').textContent).toBe('/friends/friend/expeditions')
  mock.status.now = Date.parse(sailing.returns_at!)
  view.rerender(
    <MemoryRouter>
      <View />
    </MemoryRouter>,
  )
  expect(button.hasAttribute('disabled')).toBe(true)
})
it.each(['loading', 'none', 'expired', 'boosted', 'error'] as const)(
  'disables trap help for %s and leaves gifting available',
  (kind) => {
    if (kind !== 'loading')
      mock.status.friends = [
        {
          ...sailing,
          ...(kind === 'none' ? { expedition_id: null, returns_at: null } : {}),
          ...(kind === 'expired' ? { returns_at: '2026-10-26T04:00:00Z' } : {}),
          ...(kind === 'boosted' ? { boosted: true } : {}),
        },
      ]
    mock.status.error = kind === 'error'
    render(
      <MemoryRouter>
        <View />
      </MemoryRouter>,
    )
    const button = screen.getByRole('button', { name: '통발 유인' })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(screen.getByLabelText('현재 경로').textContent).toBe('/')
    expect(screen.getByRole('link', { name: '친구퐁이에게 선물하기' }).getAttribute('href')).toBe(
      '/storage?giftTo=friend',
    )
  },
)
