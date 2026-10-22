import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import LadderGame from '@/features/arcade/ladder-game'
import { LADDER_REVEAL_MS, LADDER_WIPE_MS, practiceLadder } from '@/features/arcade/ladder-model'
const server = vi.hoisted(() => ({ play: vi.fn(), refresh: vi.fn() }))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'ladder-test' } } }),
}))
vi.mock('@/features/gold/gold-provider', () => ({
  GoldIcon: () => null,
  useGold: () => ({ wallet: { gold: 1000 }, loading: false, refresh: server.refresh }),
}))
vi.mock('@/features/arcade/ladder-api', async (original) => ({
  ...(await original<typeof import('@/features/arcade/ladder-api')>()),
  playLadder: server.play,
}))
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.useFakeTimers()
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
})
function show() {
  return render(
    <MemoryRouter>
      <LadderGame />
    </MemoryRouter>,
  )
}
it('explains how to depart and keeps adjusted stakes valid', () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: '연습' }))
  for (const name of [
    '조개 줍는 해변',
    '순풍의 뱃길',
    '풍어의 물결',
    '상어의 해협',
    '용왕의 보물고',
  ])
    expect(screen.getByRole('button', { name: new RegExp(name) })).toBeTruthy()
  expect(screen.queryByRole('button', { name: '1번 사다리' })).toBeNull()
  expect(screen.queryByRole('spinbutton')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '여기로 떠날래요' }))
  fireEvent.click(screen.getByRole('button', { name: '베팅금 20골드 늘리기' }))
  expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('40')
  fireEvent.click(screen.getByRole('button', { name: '조개 고르기' }))
  expect(screen.getAllByRole('button', { name: /^[1-6]번 사다리$/ })).toHaveLength(6)
  expect(screen.getByRole('button', { name: '조개를 선택해주세요' }).hasAttribute('disabled')).toBe(
    true,
  )
  fireEvent.click(screen.getByRole('button', { name: '1번 사다리' }))
  expect(screen.getByText('1번 조개 · 40골드 · 연습')).toBeTruthy()
  expect(screen.getByRole('button', { name: '연습으로 출발' }).hasAttribute('disabled')).toBe(false)
})
it('plays practice without RPC and keeps result buttons and payouts hidden until arrival', async () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: '연습' }))
  fireEvent.click(screen.getByRole('button', { name: '여기로 떠날래요' }))
  fireEvent.click(screen.getByRole('button', { name: '조개 고르기' }))
  fireEvent.click(screen.getByRole('button', { name: '2번 사다리' }))
  fireEvent.click(screen.getByRole('button', { name: '연습으로 출발' }))
  await act(async () => {})
  expect(server.play).not.toHaveBeenCalled()
  expect(screen.getByRole('img', { name: '선택한 사다리를 따라 내려가는 중' })).toBeTruthy()
  expect(document.querySelector('.ladder-wipe')).toBeTruthy()
  expect(document.querySelector('.ladder-traveler')).toBeNull()
  await act(() => vi.advanceTimersByTimeAsync(LADDER_WIPE_MS))
  expect(document.querySelector('.ladder-wipe')).toBeNull()
  expect(document.querySelector('.ladder-route-revealing')).toBeTruthy()
  expect(document.querySelector('.ladder-board circle')).toBeNull()
  expect(document.querySelector('.ladder-endpoints')?.textContent).toBe('×0.7×0.8×0.9×1×1.2×1.4')
  expect(screen.queryByText('골드 지급')).toBeNull()
  expect(document.querySelector('.ladder-shell-open')).toBeNull()
  expect(screen.queryByRole('button', { name: '나가기', exact: true })).toBeNull()
  await act(() => vi.advanceTimersByTimeAsync(LADDER_REVEAL_MS - LADDER_WIPE_MS - 1))
  expect(screen.queryByText('골드 지급')).toBeNull()
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(screen.getByText('골드 지급')).toBeTruthy()
  expect(document.querySelector('.ladder-voyage-animation')).toBeNull()
  expect(document.querySelectorAll('.ladder-endpoints .ladder-shell-open')).toHaveLength(1)
  expect(document.querySelector('.ladder-result-icon')).toBeTruthy()
  expect(screen.getByRole('button', { name: '나가기', exact: true })).toBeTruthy()
  expect(screen.getByRole('img', { name: '도착한 사다리 경로' })).toBeTruthy()
  expect(document.querySelector('.ladder-traveler')).toBeNull()
  expect(document.querySelector('.ladder-endpoints')?.textContent).toContain('×')
  expect(server.refresh).not.toHaveBeenCalled()
})
it('retries uncertain real bets with the same operation and locks choices until resolved', async () => {
  server.play
    .mockRejectedValueOnce(new Error('network'))
    .mockImplementationOnce(async (bet) => practiceLadder(bet, () => 0.4))
  show()
  fireEvent.click(screen.getByRole('button', { name: '실전(무료)' }))
  fireEvent.click(screen.getByRole('button', { name: '여기로 떠날래요' }))
  fireEvent.click(screen.getByRole('button', { name: '조개 고르기' }))
  fireEvent.click(screen.getByRole('button', { name: '3번 사다리' }))
  fireEvent.click(screen.getByRole('button', { name: '20 걸고 출발' }))
  await act(async () => {})
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByLabelText('베팅 20골드')).toBeNull()
  expect(screen.getByRole('button', { name: '1번 사다리' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '이전 베팅 결과 확인' }))
  await act(async () => {})
  expect(server.play.mock.calls[0][0]).toEqual(server.play.mock.calls[1][0])
  expect(screen.getByLabelText('베팅 20골드')).toBeTruthy()
  expect(screen.queryByLabelText(/^지급 \d+골드$/)).toBeNull()
  expect(server.refresh).not.toHaveBeenCalled()
  await act(() => vi.advanceTimersByTimeAsync(LADDER_REVEAL_MS))
  expect(server.refresh).toHaveBeenCalledOnce()
  expect(screen.getByLabelText(/^지급 \d+골드$/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '나가기', exact: true }))
  expect(server.play).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('button', { name: '실전(무료)' })).toBeTruthy()
  expect(server.play).toHaveBeenCalledTimes(2)
})
it('explains a rejected server configuration and unlocks a six-lane mode without retaining an uncharged bet', async () => {
  server.play
    .mockRejectedValueOnce(new Error('INVALID_LADDER_REQUEST'))
    .mockImplementationOnce(async (bet) => practiceLadder(bet, () => 0.4))
  show()
  fireEvent.click(screen.getByRole('button', { name: '실전(무료)' }))
  fireEvent.click(screen.getByRole('button', { name: /풍어의 물결/ }))
  fireEvent.click(screen.getByRole('button', { name: '여기로 떠날래요' }))
  fireEvent.click(screen.getByRole('button', { name: '조개 고르기' }))
  fireEvent.click(screen.getByRole('button', { name: '6번 사다리' }))
  fireEvent.click(screen.getByRole('button', { name: '20 걸고 출발' }))
  await act(async () => {})
  expect(screen.getByRole('alert').textContent).toContain('사다리 설정이 서버와 맞지 않아요')
  expect(localStorage.getItem('pongdang:ladder-pending:ladder-test')).toBeNull()
  expect(screen.getByRole('button', { name: '5번 사다리' }).hasAttribute('disabled')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '5번 사다리' }))
  fireEvent.click(screen.getByRole('button', { name: '20 걸고 출발' }))
  await act(async () => {})
  expect(server.play.mock.calls[1][0]).toMatchObject({ mode: 'lucky', stake: 20, choice: 4 })
  expect(server.play.mock.calls[0][0].operation).not.toBe(server.play.mock.calls[1][0].operation)
  expect(screen.getByRole('img', { name: '선택한 사다리를 따라 내려가는 중' })).toBeTruthy()
})
it('restores a pending real bet after remount without silently placing another bet', async () => {
  const bet = {
    operation: '00000000-0000-0000-0000-000000000001',
    mode: 'storm',
    stake: 100,
    choice: 3,
  }
  localStorage.setItem('pongdang:ladder-pending:ladder-test', JSON.stringify(bet))
  server.play.mockImplementationOnce(async (pending) => practiceLadder(pending, () => 0.5))
  show()
  await act(async () => {})
  expect(screen.getByRole('button', { name: '이전 베팅 결과 확인' })).toBeTruthy()
  expect(server.play).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '이전 베팅 결과 확인' }))
  await act(async () => {})
  expect(server.play).toHaveBeenCalledWith(bet)
})
it('keeps an unresolved bet recoverable after leaving the modal', async () => {
  server.play.mockRejectedValueOnce(new Error('network'))
  show()
  fireEvent.click(screen.getByRole('button', { name: '실전(무료)' }))
  fireEvent.click(screen.getByRole('button', { name: '여기로 떠날래요' }))
  fireEvent.click(screen.getByRole('button', { name: '조개 고르기' }))
  fireEvent.click(screen.getByRole('button', { name: '1번 사다리' }))
  fireEvent.click(screen.getByRole('button', { name: '20 걸고 출발' }))
  await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: '게임 나가기' }))
  fireEvent.click(screen.getByRole('button', { name: '나가기', exact: true }))
  await act(async () => {})
  expect(screen.getByRole('button', { name: '연습' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '미확인 베팅 이어서 확인' }))
  expect(screen.getByRole('button', { name: '이전 베팅 결과 확인' })).toBeTruthy()
  expect(server.play).toHaveBeenCalledOnce()
})
