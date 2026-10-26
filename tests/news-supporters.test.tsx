import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NewsSupporters } from '@/features/development-fund/news-supporters'
import { readAccountResource, setQueryAccount } from '@/lib/account-cache'
import type { FundState, FundSupporter } from '@/features/development-fund/api'
const mock = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'islander' } }, recovery: false }),
}))
vi.mock('@/features/profile/player-avatar', () => ({
  PlayerAvatar: ({ nickname }: { nickname: string }) => <img alt={`${nickname}의 아바타`} />,
}))
vi.mock('@/features/development-fund/api', async (original) => ({
  ...(await original<typeof import('@/features/development-fund/api')>()),
  readFund: mock.read,
}))
const supporter = (rank: number): FundSupporter => ({
  userId: `supporter-${rank}`,
  nickname: `후원퐁이${rank}`,
  avatarPath: null,
  totalWon: String(120000 / rank),
  rank,
})
const data: FundState = {
  operator: false,
  summary: { totalWon: '250000', supporterCount: 4, donationCount: 5 },
  myPendingCount: 0,
  supporters: [4, 2, 1, 3].map(supporter),
  hasMore: false,
  cheers: { items: [], hasMore: false },
}
beforeEach(() => {
  vi.resetAllMocks()
  setQueryAccount('islander')
  mock.read.mockResolvedValue(data)
})
afterEach(() => {
  cleanup()
  setQueryAccount(null)
})
function show(active = true) {
  return render(
    <MemoryRouter>
      <NewsSupporters active={active} />
    </MemoryRouter>,
  )
}
it('loads only when selected and shares the existing development fund cache', async () => {
  const view = show(false)
  await act(async () => {})
  expect(mock.read).not.toHaveBeenCalled()
  view.rerender(
    <MemoryRouter>
      <NewsSupporters active />
    </MemoryRouter>,
  )
  expect(await screen.findByRole('heading', { name: '후원퐁이1' })).toBeTruthy()
  expect(await readAccountResource(['development-fund', 0], mock.read)).toEqual(data)
  expect(mock.read).toHaveBeenCalledOnce()
})
it('shows shared honor titles without amounts or numeric ranks', async () => {
  show()
  await screen.findByRole('heading', { name: '후원퐁이1' })
  expect(screen.getAllByRole('listitem').map((item) => item.getAttribute('aria-label'))).toEqual([
    '후원퐁이1',
    '후원퐁이2',
    '후원퐁이3',
    '후원퐁이4',
  ])
  expect(screen.queryByText(/^[\d,]+원$/)).toBeNull()
  expect(screen.queryByText(/^\d+위$/)).toBeNull()
  expect(screen.getByText('퐁당섬 대주주')).toBeTruthy()
  expect(screen.getByText('퐁당섬 명예이사')).toBeTruthy()
  expect(screen.getByRole('link', { name: '발전기금 자세히 보기' }).getAttribute('href')).toBe(
    '/development-fund',
  )
})
it('loads further supporter pages on demand using the returned page length', async () => {
  mock.read.mockImplementation((_signal: AbortSignal, offset = 0) =>
    Promise.resolve({
      ...data,
      supporters: offset === 0 ? [1, 2, 3].map(supporter) : [supporter(4)],
      hasMore: offset === 0,
    }),
  )
  show()
  await screen.findByRole('heading', { name: '후원퐁이1' })
  expect(mock.read).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: '더 보기' }))
  await screen.findByRole('listitem', { name: '후원퐁이4' })
  expect(mock.read.mock.calls[1][1]).toBe(3)
  expect(mock.read.mock.calls[1][0]).toBeInstanceOf(AbortSignal)
  expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull()
})
it('uses the same title for tied supporters on different pages', async () => {
  mock.read.mockImplementation((_signal: AbortSignal, offset = 0) =>
    Promise.resolve({
      ...data,
      supporters:
        offset === 0
          ? [supporter(1), supporter(2)]
          : [{ ...supporter(3), rank: 2, totalWon: supporter(2).totalWon }],
      hasMore: offset === 0,
    }),
  )
  show()
  await screen.findByRole('heading', { name: '후원퐁이1' })
  fireEvent.click(screen.getByRole('button', { name: '더 보기' }))
  await screen.findByRole('listitem', { name: '후원퐁이3' })
  expect(screen.getAllByText('퐁당섬 명예이사')).toHaveLength(2)
  expect(screen.queryByText(/^[\d,]+원$/)).toBeNull()
  expect(screen.queryByText(/^\d+위$/)).toBeNull()
})
it('keeps the empty state and fund link available when no public supporters exist', async () => {
  mock.read.mockResolvedValue({ ...data, supporters: [] })
  show()
  expect(await screen.findByText(/아직 공개된 후원이 없어요/)).toBeTruthy()
  expect(screen.queryByRole('listitem')).toBeNull()
  expect(screen.getByRole('link', { name: '발전기금 자세히 보기' })).toBeTruthy()
})
it('lets a failed read recover without displaying a fabricated ranking', async () => {
  mock.read.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(data)
  show()
  await screen.findByRole('alert')
  expect(screen.queryByRole('listitem')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  await waitFor(() => expect(screen.getByRole('heading', { name: '후원퐁이1' })).toBeTruthy())
  expect(mock.read).toHaveBeenCalledTimes(2)
})
