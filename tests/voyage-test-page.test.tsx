import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { VoyageBetsTestPage, VoyageTestBoard } from '@/features/voyage-bets/voyage-bets-test-page'
import { voyageTestProjection } from '@/features/voyage-bets/voyage-test-api'
import * as production from '@/features/voyage-bets/api'
import { makeVoyageTestSample } from './fixtures/voyage-test-sample'
const mock = vi.hoisted(() => ({ operator: false, query: vi.fn(), refetch: vi.fn() }))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'operator' } } }),
}))
vi.mock('@/features/notices/use-operator', () => ({
  useOperator: () => ({ operator: mock.operator, loading: false }),
}))
vi.mock('@/lib/account-query', () => ({ useAccountResource: mock.query }))
vi.mock('@/features/collection/collectible-thumbnail', () => ({ CollectibleThumbnail: () => null }))
beforeEach(() => {
  mock.operator = false
  mock.query.mockReturnValue({
    data: makeVoyageTestSample(),
    isFetching: false,
    isError: false,
    refetch: mock.refetch,
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
it('blocks direct navigation for non-operators before fetching test data', () => {
  const view = render(
    <MemoryRouter>
      <VoyageBetsTestPage />
    </MemoryRouter>,
  )
  expect(screen.getByRole('alert').textContent).toBe('운영자 전용 페이지예요.')
  expect(mock.query).not.toHaveBeenCalled()
  mock.operator = true
  view.rerender(
    <MemoryRouter>
      <VoyageBetsTestPage />
    </MemoryRouter>,
  )
  expect(screen.getByRole('region', { name: '운영자 테스트 도구' })).toBeTruthy()
  expect(mock.query).toHaveBeenCalledWith('voyage-race-test-sample', expect.any(Function), {
    staleTime: Infinity,
  })
})
it('jumps through hourly states and rehearses settlement without any production trade or wallet event', async () => {
  const sample = makeVoyageTestSample(),
    trade = vi.spyOn(production, 'placeVoyageBet'),
    wallet = vi.fn(),
    reload = vi.fn()
  window.addEventListener('wallet-changed', wallet)
  try {
    render(
      <MemoryRouter>
        <VoyageTestBoard sample={sample} onNew={reload} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getAllByRole('button', { name: '이 회사 선택' })[0])
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '500' }))
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 확정하기' }))
    await screen.findByText('테스트 골드 9,500')
    fireEvent.click(screen.getByRole('button', { name: '1시간 후' }))
    expect(screen.getByRole('list', { name: '현재 회사 순위' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '2시간 후' }))
    expect(screen.getByText('조업 중 · 2/3해역 완료')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '최종 정산' }))
    expect(screen.getByText('테스트 골드 9,500')).toBeTruthy()
    expect(screen.getByText('테스트 보관함 1,500골드')).toBeTruthy()
    expect(screen.getByRole('region', { name: '내 정산 결과' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /보관함에서 받기/ })).toBeNull()
    expect(screen.getByRole('list', { name: '최종 회사 순위' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '최종 정산' }))
    expect(screen.getByText('테스트 골드 9,500')).toBeTruthy()
    expect(screen.getByText('테스트 보관함 1,500골드')).toBeTruthy()
    expect(screen.getByRole('button', { name: '다음 단계 →' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '접수 시작' }))
    expect(screen.getByText('테스트 골드 9,500')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '내 선택 수정' }))
    const cancel = await screen.findByRole('alertdialog')
    fireEvent.click(within(cancel).getByRole('button', { name: '기존 참여 취소' }))
    fireEvent.click(within(cancel).getByRole('button', { name: '취소하고 반환받기' }))
    await waitFor(() => expect(screen.getByText('테스트 골드 10,000')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '새 항차 뽑기' }))
    expect(reload).toHaveBeenCalledOnce()
    expect(trade).not.toHaveBeenCalled()
    expect(wallet).not.toHaveBeenCalled()
  } finally {
    window.removeEventListener('wallet-changed', wallet)
  }
})
it('projects first, second, losing and refunded rewards without mutating sample data', () => {
  const sample = makeVoyageTestSample(),
    original = JSON.stringify(sample)
  expect(voyageTestProjection(sample, 'final', { planId: 'plan-0', stake: 500 }).storedGold).toBe(
    1500,
  )
  expect(voyageTestProjection(sample, 'final', { planId: 'plan-1', stake: 500 }).storedGold).toBe(
    600,
  )
  expect(voyageTestProjection(sample, 'final', { planId: 'plan-0', stake: 500 }).gold).toBe(9500)
  expect(voyageTestProjection(sample, 'final', { planId: 'plan-2', stake: 500 }).gold).toBe(9500)
  expect(voyageTestProjection(sample, 'scheduled', { planId: 'plan-0', stake: 500 }).gold).toBe(
    10000,
  )
  expect(voyageTestProjection(sample, 'open', { planId: 'plan-0', stake: 600 }).gold).toBe(10000)
  expect(JSON.stringify(sample)).toBe(original)
  sample.final.rounds[0].refunded = true
  expect(voyageTestProjection(sample, 'final', { planId: 'plan-0', stake: 500 }).storedGold).toBe(
    500,
  )
})
