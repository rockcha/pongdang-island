import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import BilliardsGame from '@/features/arcade/billiards-game'
import type { Billiards } from '@/features/arcade/billiards-model'
const engine = vi.hoisted(() => ({
  state: null as Billiards | null,
  changed: null as (() => void) | null,
}))
const server = vi.hoisted(() => ({ start: vi.fn(), save: vi.fn(), state: null as any }))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'billiards-player' } } }),
}))
vi.mock('@/lib/account-query', () => ({
  useAccountResource: () => ({ data: server.state, isFetching: false, refetch: vi.fn() }),
}))
vi.mock('@/features/arcade/billiards-api', () => ({
  readBilliards: vi.fn(),
  readBilliardsRanking: vi.fn(),
  startBilliards: server.start,
  saveBilliards: server.save,
  billiardsError: () => '다시 확인해주세요.',
}))
vi.mock('@/features/arcade/billiards-scene', () => ({
  mountBilliards: (_host: HTMLElement, state: Billiards, changed: () => void) => {
    engine.state = state
    engine.changed = changed
    changed()
    return { destroy: vi.fn() }
  },
}))
beforeEach(() => {
  server.start.mockReset()
  server.save.mockReset()
  server.state = { run: null, wallet: { gold: 100 } }
  vi.spyOn(window.history, 'back').mockImplementation(() => {})
})
const accountRun = (score = 0, finished = false) => ({
  serverNow: new Date().toISOString(),
  wallet: { gold: 90 + (finished ? Math.max(0, score) : 0) },
  run: {
    id: '00000000-0000-4000-8000-000000000001',
    engine_version: 1,
    started_at: new Date().toISOString(),
    finished_at: finished ? new Date().toISOString() : null,
    score,
    reward: finished ? Math.max(0, score) : 0,
    abandoned: false,
    replay: { version: 1, shots: [] },
  },
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  engine.state = null
  engine.changed = null
})
it('opens practice under StrictMode without an unsolicited exit prompt', async () => {
  render(
    <StrictMode>
      <BilliardsGame />
    </StrictMode>,
  )
  fireEvent.click(screen.getByRole('button', { name: '연습 시작' }))
  await waitFor(() => expect(engine.state).not.toBeNull(), { timeout: 2000 })
  expect(window.history.back).not.toHaveBeenCalled()
  expect(screen.queryByRole('alertdialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '게임 나가기' }))
  expect(await screen.findByRole('alertdialog')).toBeTruthy()
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
})
it('shows a final score once without the HUD or end-of-run log', async () => {
  render(<BilliardsGame />)
  fireEvent.click(screen.getByRole('button', { name: '연습 시작' }))
  await waitFor(() => expect(engine.state).not.toBeNull(), { timeout: 2000 })
  act(() => {
    Object.assign(engine.state!, {
      phase: 'lost',
      lives: 0,
      score: 7,
      message: '목숨 −1 · 도전 종료',
    })
    engine.changed!()
  })
  expect(screen.getAllByText('7점')).toHaveLength(1)
  expect(screen.queryByLabelText('남은 목숨 0개')).toBeNull()
  expect(screen.queryByText('목숨 −1 · 도전 종료')).toBeNull()
  expect(screen.getByRole('button', { name: '다시 도전' })).toBeTruthy()
})

it('keeps the table and reserved text rows mounted across shot and result updates', async () => {
  const { container } = render(<BilliardsGame />)
  fireEvent.click(screen.getByRole('button', { name: '연습 시작' }))
  await waitFor(() => expect(engine.state).not.toBeNull(), { timeout: 2000 })
  const board = container.querySelector('.billiards-board')
  const hud = container.querySelector('.billiards-hud-slot')
  const message = container.querySelector('.billiards-message')
  for (const phase of ['moving', 'aim', 'lost'] as const) {
    act(() => {
      Object.assign(engine.state!, {
        phase,
        shotCount: 1,
        message: '안내 문구가 길어져도 당구대 크기를 유지합니다.',
      })
      engine.changed!()
    })
    expect(container.querySelector('.billiards-board')).toBe(board)
    expect(container.querySelector('.billiards-hud-slot')).toBe(hud)
    expect(container.querySelector('.billiards-message')).toBe(message)
    expect(container.querySelector('.billiards-contact')).toBeNull()
  }
})
it('starts paid play once and shows a reward only after the verified result arrives', async () => {
  let resolve!: (value: any) => void
  server.start.mockResolvedValue(accountRun())
  server.save.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  render(<BilliardsGame />)
  const start = screen.getByRole('button', { name: '실전 (골드 10)' })
  fireEvent.click(start)
  fireEvent.click(start)
  await waitFor(() => expect(engine.state).not.toBeNull())
  expect(server.start).toHaveBeenCalledTimes(1)
  act(() => {
    Object.assign(engine.state!, { phase: 'lost', lives: 0, score: 40 })
    engine.changed!()
  })
  expect(server.save).toHaveBeenCalledExactlyOnceWith(
    accountRun().run.id,
    { version: 1, shots: [] },
    true,
  )
  expect(screen.queryByText('40골드 지급 완료')).toBeNull()
  await act(async () => {
    resolve(accountRun(40, true))
  })
  expect(screen.getByText('40골드 지급 완료')).toBeTruthy()
  act(() => engine.changed!())
  expect(server.save).toHaveBeenCalledTimes(1)
})
it('retains exactly the failed settlement for explicit retry and never charges a new entry', async () => {
  server.start.mockResolvedValue(accountRun())
  server.save
    .mockRejectedValueOnce(new Error('lost response'))
    .mockResolvedValueOnce(accountRun(20, true))
  render(<BilliardsGame />)
  fireEvent.click(screen.getByRole('button', { name: '실전 (골드 10)' }))
  await waitFor(() => expect(engine.state).not.toBeNull())
  act(() => {
    Object.assign(engine.state!, { phase: 'lost', lives: 0, score: 20 })
    engine.changed!()
  })
  await screen.findByRole('button', { name: '저장 결과 다시 확인' })
  fireEvent.click(screen.getByRole('button', { name: '저장 결과 다시 확인' }))
  await screen.findByText('20골드 지급 완료')
  expect(server.save.mock.calls[1]).toEqual(server.save.mock.calls[0])
  expect(server.start).toHaveBeenCalledTimes(1)
})
it('restores a saved shot when continuing and never saves practice scores', async () => {
  const saved = accountRun()
  saved.run.replay.shots = [{ dx: 0, dy: -60 }] as never[]
  server.state = saved
  server.start.mockResolvedValue(saved)
  const view = render(<BilliardsGame />)
  fireEvent.click(screen.getByRole('button', { name: '실전 이어하기' }))
  await waitFor(() => expect(engine.state?.shotCount).toBe(1))
  expect(engine.state?.score).toBe(10)
  expect(engine.state?.lives).toBe(4)
  view.unmount()
  engine.state = null
  render(<BilliardsGame />)
  fireEvent.click(screen.getByRole('button', { name: '연습 시작' }))
  await waitFor(() => expect(engine.state).not.toBeNull())
  act(() => {
    Object.assign(engine.state!, { phase: 'lost', lives: 0, score: 100 })
    engine.changed!()
  })
  expect(server.save).not.toHaveBeenCalled()
})
