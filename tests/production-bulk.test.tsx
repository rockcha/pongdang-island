import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BulkProductionControls } from '@/features/production/bulk-controls'
import { planProductionStart } from '@/features/production/bulk-plan'
import type { ProductionFacility, ProductionMaterial } from '@/features/production/api'
const load = vi.hoisted(() => vi.fn())
vi.mock('@/features/production/api', async (original) => ({
  ...(await original<any>()),
  loadProductionMaterials: load,
}))
const site = (id: string, price: number, input_count: number): ProductionFacility => ({
  id,
  name: id,
  price,
  input_count,
  output_count: 1,
  kind: 'trash',
  enabled: true,
  owned: true,
  description: '',
  image_path: '',
  production_minutes: 30,
  storage_minutes: 30,
  startedAt: null,
  completesAt: null,
  expiresAt: null,
  runOutput: null,
})
const sites = [site('expensive', 1000, 3), site('cheap', 300, 2)]
const material = (
  id: string,
  price: number,
  available: number,
  rarity = 'common',
): ProductionMaterial => ({
  id,
  name: id,
  sell_price: price,
  available,
  rarity,
  thumbnail_path: '',
})
beforeEach(() => load.mockReset())
afterEach(cleanup)
it('allocates cheaper materials and facilities first without reusing the same inventory', () => {
  const result = planProductionStart(sites, {
    trash: [material('dear', 50, 10, 'mythic'), material('wood', 2, 3), material('rope', 5, 2)],
  })
  expect(result.steps).toEqual([
    { facility: 'cheap', materials: { wood: 2 } },
    { facility: 'expensive', materials: { wood: 1, rope: 2 } },
  ])
  expect(result.valuable).toEqual([])
})
it('warns when stock cannot run every idle facility and makes no mutation', async () => {
  load.mockResolvedValue([material('wood', 2, 4)])
  const action = vi.fn()
  render(
    <BulkProductionControls
      sites={sites}
      now={Date.now()}
      busy={false}
      error=""
      onAction={action}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /일괄 가동/ }))
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('재료가 부족해요'),
  )
  expect(action).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('requires an explicit valuable-material acknowledgement before starting the reviewed plan', async () => {
  load.mockResolvedValue([material('신화 재료', 1, 5, 'mythic')])
  const action = vi.fn().mockResolvedValue(true)
  render(
    <BulkProductionControls
      sites={sites}
      now={Date.now()}
      busy={false}
      error=""
      onAction={action}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /일괄 가동/ }))
  const dialog = await screen.findByRole('dialog'),
    confirm = within(dialog).getByRole('button', { name: '일괄 가동' })
  expect(within(dialog).getByText('특급·신화 재료가 포함돼요')).toBeTruthy()
  expect(confirm.hasAttribute('disabled')).toBe(true)
  fireEvent.click(within(dialog).getByRole('checkbox'))
  fireEvent.click(confirm)
  await waitFor(() =>
    expect(action).toHaveBeenCalledWith({
      p_action: 'start',
      p_steps: [
        { facility: 'cheap', materials: { '신화 재료': 2 } },
        { facility: 'expensive', materials: { '신화 재료': 3 } },
      ],
      p_allow_valuable: true,
    }),
  )
})
it('requires confirmation before bulk claim and discard and supports cancellation', async () => {
  const now = Date.now(),
    date = (n: number) => new Date(now + n).toISOString(),
    action = vi.fn().mockResolvedValue(true)
  const running = sites.map((s, i) => ({
    ...s,
    startedAt: date(-2000),
    completesAt: date(-1000),
    expiresAt: date(i ? -500 : 60000),
    runOutput: 2,
  }))
  render(
    <BulkProductionControls sites={running} now={now} busy={false} error="" onAction={action} />,
  )
  fireEvent.click(screen.getByRole('button', { name: /일괄 폐기/ }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }))
  expect(action).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: /일괄 수령/ }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '일괄 수령' }))
  await waitFor(() =>
    expect(action).toHaveBeenCalledWith({
      p_action: 'claim',
      p_steps: [{ facility: 'expensive', materials: {} }],
      p_allow_valuable: false,
    }),
  )
})
