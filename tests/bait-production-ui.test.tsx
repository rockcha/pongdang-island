// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { BaitProductionPage } from '../src/features/production/bait-production-page'
const mock = vi.hoisted(() => ({ load: vi.fn(), act: vi.fn() }))
vi.mock('../src/features/production/bait-production-api', async (original) => ({
  ...(await original<object>()),
  loadBaitProduction: mock.load,
  actBaitProduction: mock.act,
}))
vi.mock('../src/components/landscape-image', () => ({
  LandscapeImage: ({ alt }: { alt: string }) => <span>{alt}</span>,
}))
const site = {
  id: 'wriggly-soil-box',
  name: '꼬물꼬물 흙상자',
  description: '연료로 미끼를 만들어요.',
  bait_id: 'bait',
  baitName: '지렁이',
  image_path: '/bait.png',
  price: 300,
  fuel_cost: 2,
  output_count: 2,
  production_minutes: 60,
  storage_minutes: 40,
  ownedCount: 5,
  startedAt: null,
  completesAt: null,
  expiresAt: null,
  runOutput: null,
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
it('shows repeat ownership without a four-site purchase cap and submits the selected quantity', async () => {
  const state = {
    serverNow: new Date().toISOString(),
    gold: 10000,
    fuel: 20,
    facilities: [site],
    sites: Array.from({ length: 5 }, (_, i) => ({ ...site, siteId: String(i) })),
  }
  mock.load.mockResolvedValue(state)
  mock.act.mockResolvedValue(state)
  render(
    <MemoryRouter>
      <BaitProductionPage shop />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('button', { name: /꼬물꼬물 흙상자/ }))
  fireEvent.change(screen.getByRole('spinbutton', { name: '구매 수량' }), {
    target: { value: '3' },
  })
  fireEvent.click(screen.getByRole('button', { name: '900골드로 구매' }))
  await waitFor(() =>
    expect(mock.act).toHaveBeenCalledWith(
      expect.objectContaining({ p_action: 'buy', p_quantity: 3, p_facility: site.id }),
    ),
  )
})
it('disables another start when four sites are working', async () => {
  const now = Date.now(),
    state = {
      serverNow: new Date(now).toISOString(),
      gold: 10000,
      fuel: 20,
      facilities: [site],
      sites: [
        ...Array.from({ length: 4 }, (_, i) => ({
          ...site,
          siteId: String(i),
          startedAt: new Date(now - 1000).toISOString(),
          completesAt: new Date(now + 60000).toISOString(),
          expiresAt: new Date(now + 120000).toISOString(),
        })),
        { ...site, siteId: 'idle' },
      ],
    }
  mock.load.mockResolvedValue(state)
  render(
    <MemoryRouter>
      <BaitProductionPage />
    </MemoryRouter>,
  )
  await screen.findAllByRole('button', { name: /꼬물꼬물 흙상자/ })
  fireEvent.click(screen.getByRole('button', { name: '대기 중' }))
  fireEvent.click(screen.getByRole('button', { name: /꼬물꼬물 흙상자/ }))
  expect(
    (screen.getByRole('button', { name: '연료·미끼 생산소가 총 4곳 가동 중이에요' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  expect(mock.act).not.toHaveBeenCalled()
})
