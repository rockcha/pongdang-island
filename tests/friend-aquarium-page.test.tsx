import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { FriendAquariumPage } from '@/features/friends/friend-aquarium-page'
vi.mock('@/features/friends/aquarium-api', () => ({
  loadFriendAquarium: async () => ({
    owner: { id: 'friend', nickname: '친구퐁이', avatar_path: null },
    tanks: [
      { id: 'one', name: '첫 어항', background_id: 'default' },
      { id: 'two', name: '두 번째 어항', background_id: 'default' },
    ],
    inhabitants: [],
    backgrounds: [],
  }),
  visitError: () => '오류',
}))
vi.mock('@/features/aquarium/tank-inhabitants', () => ({
  TankInhabitants: () => <div data-testid="inhabitants" />,
}))
vi.mock('@/features/friends/aquarium-care', () => ({
  AquariumCare: ({ tank }: { tank: string }) => <div>돌보기 {tank}</div>,
}))
afterEach(cleanup)
it('shows the owner and browses friend tanks without a collectible list', async () => {
  render(
    <MemoryRouter initialEntries={['/friends/friend/aquarium']}>
      <Routes>
        <Route path="/friends/:ownerId/aquarium" element={<FriendAquariumPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByLabelText('첫 어항')
  const tank = screen.getByLabelText('첫 어항')
  expect(tank.className).toContain('w-full')
  expect(tank.className).toContain('flex-1')
  expect(tank.className).toContain('min-h-0')
  expect(screen.getByRole('link', { name: '친구퐁이' }).parentElement?.className).toContain('h-14')
  expect(screen.getByRole('link', { name: '내 어항' }).getAttribute('href')).toBe('/aquarium')
  expect(screen.getByRole('button', { name: '친구 어항' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '다음 어항' }))
  expect(screen.getByLabelText('두 번째 어항')).toBeTruthy()
  expect(screen.getByText('돌보기 two')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '다음 어항' }))
  expect(screen.getByLabelText('첫 어항')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '이전 어항' }))
  expect(screen.getByLabelText('두 번째 어항')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '이전 어항' }))
  expect(screen.queryByRole('button', { name: '개체 목록' })).toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
})
