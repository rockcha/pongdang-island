import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import BilliardsGame from '@/features/arcade/billiards-game'
import type { Billiards } from '@/features/arcade/billiards-model'
const engine = vi.hoisted(() => ({
  state: null as Billiards | null,
  changed: null as (() => void) | null,
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
  vi.spyOn(window.history, 'back').mockImplementation(() => {})
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
