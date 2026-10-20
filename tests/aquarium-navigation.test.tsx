import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { AquariumTankPicker } from '@/features/aquarium/aquarium-tank-picker'
import { FriendAquariumPicker } from '@/features/friends/friend-aquarium-picker'

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'me' } } }),
}))
vi.mock('@/features/social/social-provider', () => ({
  useSocial: () => ({
    owner: 'me',
    loading: false,
    error: null,
    refresh: vi.fn(),
    requests: [
      {
        id: 'first',
        status: 'accepted',
        sender_id: 'me',
        recipient_id: 'friend-one',
        recipient: { nickname: '첫 친구', equipped_title: '바다의 탐험가' },
      },
      {
        id: 'second',
        status: 'accepted',
        sender_id: 'friend-two',
        recipient_id: 'me',
        sender: { nickname: '최근 친구' },
      },
      {
        id: 'pending',
        status: 'pending',
        sender_id: 'me',
        recipient_id: 'pending-person',
        recipient: { nickname: '대기 친구' },
      },
    ],
  }),
}))
afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('selects a tank from its title and keeps adding tanks available in the picker', () => {
  const select = vi.fn(),
    add = vi.fn(),
    rename = vi.fn()
  render(
    <AquariumTankPicker
      tanks={[
        { id: 'one', name: '첫 어항', background_id: 'default' },
        { id: 'two', name: '둘째 어항', background_id: 'default' },
      ]}
      selectedId="one"
      backgrounds={[]}
      busy={false}
      onSelect={select}
      onAdd={add}
      onRename={rename}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '어항 선택' }))
  fireEvent.click(screen.getByRole('button', { pressed: false }))
  expect(select).toHaveBeenCalledWith('two')
  fireEvent.click(screen.getByRole('button', { name: '어항 선택' }))
  fireEvent.click(screen.getByRole('button', { name: '어항 추가' }))
  expect(add).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: '어항 선택' }))
  fireEvent.click(screen.getByRole('button', { name: '둘째 어항 이름 변경' }))
  expect(rename).toHaveBeenCalledWith('two')
  expect(select).toHaveBeenCalledTimes(1)
})

it('shows accepted friends in recent visit order and links directly to their aquariums', () => {
  localStorage.setItem('pongdang:recent-aquariums:me', JSON.stringify(['friend-two']))
  render(
    <MemoryRouter>
      <FriendAquariumPicker />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: '친구 어항' }))
  const friends = screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('href')?.endsWith('/aquarium'))
  expect(friends.map((link) => link.getAttribute('href'))).toEqual([
    '/friends/friend-two/aquarium',
    '/friends/friend-one/aquarium',
  ])
  expect(screen.queryByText('대기 친구')).toBeNull()
  expect(screen.getByText('바다의 탐험가')).toBeTruthy()
  expect(screen.queryByText('어항 구경하기')).toBeNull()
  fireEvent.click(friends[1])
  expect(JSON.parse(localStorage.getItem('pongdang:recent-aquariums:me')!)[0]).toBe('friend-one')
})
