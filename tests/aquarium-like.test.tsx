import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AquariumLike } from '@/features/friends/aquarium-like'
const mock = vi.hoisted(() => ({ read: vi.fn(), like: vi.fn() }))
vi.mock('@/features/friends/aquarium-likes-api', () => ({
  readAquariumLike: mock.read,
  likeAquarium: mock.like,
}))
const today = {
  count: 7,
  liked: false,
  serverNow: '2026-10-26T14:59:59Z',
  nextLikeAt: '2026-10-26T15:00:00Z',
}
beforeEach(() => {
  vi.resetAllMocks()
  mock.read.mockResolvedValue(today)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
it('adds one daily like and keeps the cumulative count and filled heart without an unlike action', async () => {
  mock.like.mockResolvedValue({ ...today, count: 8, liked: true })
  render(<AquariumLike owner="friend" />)
  const button = await screen.findByRole('button', { name: '아쿠아리움 좋아요' })
  await waitFor(() => expect(button.textContent).toBe('7'))
  fireEvent.click(button)
  fireEvent.click(button)
  await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'))
  expect(button.textContent).toBe('8')
  expect(button.hasAttribute('disabled')).toBe(true)
  expect(mock.like).toHaveBeenCalledExactlyOnceWith('friend')
})
it('allows retrying a failed write without changing the visible count', async () => {
  mock.like
    .mockRejectedValueOnce(Error('offline'))
    .mockResolvedValueOnce({ ...today, count: 8, liked: true })
  render(<AquariumLike owner="friend" />)
  const button = await screen.findByRole('button', { name: '아쿠아리움 좋아요' })
  await waitFor(() => expect(button.textContent).toBe('7'))
  fireEvent.click(button)
  await screen.findByRole('alert')
  expect(button.textContent).toBe('7')
  expect(button.hasAttribute('disabled')).toBe(false)
  fireEvent.click(button)
  await waitFor(() => expect(button.textContent).toBe('8'))
  expect(mock.like).toHaveBeenCalledTimes(2)
})
it('refreshes at Korean midnight and allows another like without resetting the total', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(today.serverNow))
  mock.read
    .mockResolvedValueOnce({ ...today, liked: true })
    .mockResolvedValueOnce({
      ...today,
      liked: false,
      serverNow: '2026-10-26T15:00:00Z',
      nextLikeAt: '2026-10-27T15:00:00Z',
    })
  render(<AquariumLike owner="friend" />)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5)
  })
  const button = screen.getByRole('button', { name: '아쿠아리움 좋아요' })
  expect(button.hasAttribute('disabled')).toBe(true)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1200)
  })
  expect(mock.read).toHaveBeenCalledTimes(2)
  expect(button.textContent).toBe('7')
  expect(button.hasAttribute('disabled')).toBe(false)
})
