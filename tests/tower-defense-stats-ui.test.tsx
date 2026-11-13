import { cleanup, render, screen, fireEvent, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { TowerInspector } from '@/features/arcade/tower-defense-inspector'
import { type Building } from '@/features/arcade/tower-defense-engine'
afterEach(cleanup)
function show(overrides: Partial<Building> = {}) {
  const building: Building = {
    cell: 100,
    kind: 'cruise',
    level: 1,
    cooldown: 0,
    aim: 0,
    flash: 0,
    spent: 770,
    charge: 0,
    chargeTarget: 0,
    ...overrides,
  }
  render(
    <MemoryRouter>
      <TowerInspector
        building={building}
        active
        gold={10000}
        onUpgrade={() => {}}
        onSell={() => {}}
      />
    </MemoryRouter>,
  )
  return building
}
it('uses a number badge and opens a legible current/next upgrade comparison', async () => {
  show()
  expect(screen.getByLabelText('1단계 강화').textContent).toBe('1')
  expect(screen.queryByText(/Lv\./)).toBeNull()
  const trigger = screen.getByRole('button', { name: '능력치 보기' })
  fireEvent.click(trigger)
  const dialog = await screen.findByRole('alertdialog', { name: '월광 순항미사일 기지 능력치' }),
    table = within(dialog).getByRole('table')
  const attack = within(table).getByRole('row', { name: /공격력/ })
  expect(within(dialog).getByLabelText('건설 코인 10000').textContent).toContain('10,000')
  expect(within(attack).getByText('324')).toBeTruthy()
  expect(within(attack).getByText('444')).toBeTruthy()
  expect(within(table).getByRole('columnheader', { name: /강화 후/ }).textContent).toContain('2')
  expect(within(dialog).getByText('320')).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }))
  expect(screen.queryByRole('alertdialog')).toBeNull()
})
it('shows the effective tracking attack at max level without an empty upgrade column', async () => {
  show({ level: 3, specialization: 'tracking' })
  fireEvent.click(screen.getByRole('button', { name: '능력치 보기' }))
  const dialog = await screen.findByRole('alertdialog'),
    table = within(dialog).getByRole('table')
  expect(within(table).getAllByRole('columnheader')).toHaveLength(2)
  expect(within(table).getByText('748.8')).toBeTruthy()
  expect(within(dialog).getByText(/비행시간 −25%/)).toBeTruthy()
  expect(within(dialog).getByLabelText('3단계 강화').textContent).toBe('3')
})
it('shows the area attack badge and splash explanation after bombardment specialization', async () => {
  show({ level: 3, specialization: 'bombard' })
  expect(screen.getByText('광역')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '능력치 보기' }))
  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('광역')).toBeTruthy()
  expect(within(dialog).getByText(/주변 최대 2마리에 40%/)).toBeTruthy()
})
it('shows the strengthened frost slow and rapid flame DPS as actually applied by the engine', async () => {
  show({ kind: 'frost', level: 3, specialization: 'power' })
  fireEvent.click(screen.getByRole('button', { name: '능력치 보기' }))
  const dialog = await screen.findByRole('alertdialog')
  expect(
    within(within(dialog).getByRole('row', { name: /이동 감속/ })).getByText('60'),
  ).toBeTruthy()
  cleanup()
  show({ kind: 'flame', level: 3, specialization: 'rapid' })
  fireEvent.click(screen.getByRole('button', { name: '능력치 보기' }))
  const flame = await screen.findByRole('alertdialog')
  expect(
    within(within(flame).getByRole('row', { name: /초당 공격력/ })).getByText('32.5'),
  ).toBeTruthy()
})
