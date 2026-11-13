import { cleanup, render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { TowerInspector } from '@/features/arcade/tower-defense-inspector'
import {
  createDefense,
  beginDefense,
  build,
  upgrade,
  cellAt,
  specializationCost,
  type TowerKind,
} from '@/features/arcade/tower-defense-engine'
afterEach(cleanup)
function show(kind: TowerKind) {
  const state = createDefense()
  beginDefense(state)
  state.gold = 10000
  const cell = cellAt(6, 8)
  build(state, cell, kind)
  for (let i = 0; i < 3; i++) upgrade(state, cell)
  const onSpecialize = vi.fn(),
    b = state.buildings[0]
  render(
    <MemoryRouter>
      <TowerInspector
        building={b}
        active
        gold={state.gold}
        canSpecialize
        onUpgrade={() => {}}
        onSell={() => {}}
        onSpecialize={onSpecialize}
      />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: '특화 선택' }))
  return { b, onSpecialize }
}
it('offers three clear specialization choices and quotes the hybrid price', async () => {
  const { b, onSpecialize } = show('missile'),
    dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByLabelText(/^건설 코인 /).textContent).toContain('건설 코인')
  expect(within(dialog).getByRole('button', { name: /화력 특화/ })).toBeTruthy()
  expect(within(dialog).getByRole('button', { name: /연사 특화/ })).toBeTruthy()
  const hybrid = within(dialog).getByRole('button', { name: /겸용 특화/ })
  expect(hybrid.textContent).toContain('80%')
  expect(hybrid.textContent).toContain(String(specializationCost(b, 'hybrid')))
  fireEvent.click(hybrid)
  expect(onSpecialize).toHaveBeenCalledWith('hybrid')
})
it.each(['sniper', 'harpoon'] as const)(
  'does not sell a redundant hybrid specialization to %s',
  async (kind) => {
    show(kind)
    expect(
      within(await screen.findByRole('alertdialog')).queryByRole('button', { name: /겸용 특화/ }),
    ).toBeNull()
  },
)
it('offers the cruise tower bombardment and tracking specializations', async () => {
  const { onSpecialize } = show('cruise'),
    dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).queryByRole('button', { name: /겸용 특화/ })).toBeNull()
  expect(within(dialog).getByRole('button', { name: /폭격 특화/ }).textContent).toContain('40%')
  fireEvent.click(within(dialog).getByRole('button', { name: /추적 특화/ }))
  expect(onSpecialize).toHaveBeenCalledWith('tracking')
})
