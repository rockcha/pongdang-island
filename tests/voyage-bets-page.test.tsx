import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { VoyageBetsPage } from '@/features/voyage-bets/voyage-bets-page'
const mock = vi.hoisted(() => ({
  place: vi.fn(),
  id: 0,
  owner: 'owner',
  refetch: vi.fn(),
  now: Date.parse('2026-10-30T00:00:00Z'),
  rounds: [] as import('@/features/voyage-bets/api').VoyageRound[],
}))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: mock.owner } } }),
}))
vi.mock('@/lib/account-query', () => ({
  useAccountResource: () => ({
    data: { serverNow: '2026-10-30T00:00:00Z', rounds: mock.rounds },
    dataUpdatedAt: Date.parse('2026-10-30T00:00:00Z'),
    refetch: mock.refetch,
  }),
}))
vi.mock('@/lib/app-clock', () => ({ useAppClock: () => mock.now }))
vi.mock('@/lib/random-id', () => ({ randomId: () => `operation-${++mock.id}` }))
vi.mock('@/features/voyage-bets/api', async (original) => ({
  ...(await original<typeof import('@/features/voyage-bets/api')>()),
  placeVoyageBet: mock.place,
}))
vi.mock('@/features/voyage-bets/voyage-push-toggle', () => ({ VoyagePushToggle: () => null }))
vi.mock('@/features/voyage-bets/voyage-bets-view', () => ({
  VoyageBetsView: ({
    onBet,
    onRetry,
    uncertain,
    busy,
  }: {
    onBet: Function
    onRetry: () => void
    uncertain: boolean
    busy: boolean
  }) => (
    <>
      <button
        disabled={busy}
        onClick={() => {
          void onBet({ id: 'plan' }, 100)
        }}
      >
        참여
      </button>
      <button onClick={onRetry}>재확인</button>
      <output>{uncertain ? '불확실' : '준비'}</output>
    </>
  ),
}))
afterEach(() => {
  cleanup()
  mock.place.mockReset()
  mock.id = 0
  mock.owner = 'owner'
  mock.rounds = []
  mock.now = Date.parse('2026-10-30T00:00:00Z')
})
it('refreshes at each hourly disclosure even while the sailing phase stays the same', async () => {
  mock.rounds = [
    {
      id: 'round',
      opensAt: '2026-10-29T23:30:00Z',
      departsAt: '2026-10-30T00:00:00Z',
      resultsAt: '2026-10-30T03:00:00Z',
      phase: 'sailing',
      completedRegions: 0,
      nextRevealAt: '2026-10-30T01:00:00Z',
      refunded: false,
      myStake: 0,
      myBet: null,
      plans: [],
    },
  ]
  const view = render(<VoyageBetsPage />)
  mock.refetch.mockClear()
  mock.now += 3600000
  view.rerender(<VoyageBetsPage />)
  await waitFor(() => expect(mock.refetch).toHaveBeenCalledTimes(1))
  mock.now += 3600000
  view.rerender(<VoyageBetsPage />)
  await waitFor(() => expect(mock.refetch).toHaveBeenCalledTimes(2))
})
it('reuses the same operation after an ambiguous failure and blocks a second bet until resolved', async () => {
  mock.place.mockRejectedValueOnce(new Error('network disconnected')).mockResolvedValueOnce({})
  render(<VoyageBetsPage />)
  fireEvent.click(screen.getByText('참여'))
  await screen.findByText('불확실')
  fireEvent.click(screen.getByText('참여'))
  expect(mock.place).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByText('재확인'))
  await screen.findByText('준비')
  expect(mock.place).toHaveBeenCalledTimes(2)
  expect(mock.place.mock.calls[0][0]).toEqual(mock.place.mock.calls[1][0])
  expect(mock.place.mock.calls[1][0].p_operation_id).toBe('operation-1')
})
it('clears a definite rejection and resets an unresolved request when the account changes', async () => {
  mock.place
    .mockRejectedValueOnce(new Error('INSUFFICIENT_GOLD'))
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({})
  const rendered = render(<VoyageBetsPage />)
  fireEvent.click(screen.getByText('참여'))
  await waitFor(() => expect(mock.refetch).toHaveBeenCalled())
  fireEvent.click(screen.getByText('참여'))
  await screen.findByText('불확실')
  mock.owner = 'other'
  rendered.rerender(<VoyageBetsPage />)
  await screen.findByText('준비')
  fireEvent.click(screen.getByText('참여'))
  await waitFor(() => expect(mock.place).toHaveBeenCalledTimes(3))
  expect(mock.place.mock.calls.map((c) => c[0].p_operation_id)).toEqual([
    'operation-1',
    'operation-2',
    'operation-3',
  ])
})
