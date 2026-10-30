import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { FarmView } from '@/features/farm/isometric-farm'
import { farmFixture } from './farm-fixture'
const calls = vi.hoisted(() => ({ farm: vi.fn(), trade: vi.fn() }))
vi.mock('@/features/farm/api', () => ({ farmAction: calls.farm }))
vi.mock('@/features/my-island/api', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  tradeIsland: calls.trade,
}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})
function harness(initial = farmFixture(), uncertain = false) {
  const receipts = new Map(),
    save = vi.fn(),
    reload = vi.fn(async () => initial)
  function Harness() {
    const [snapshot, setSnapshot] = useState(initial),
      [gold, setGold] = useState(100000)
    calls.farm.mockImplementation(async (args) => {
      let result = receipts.get(args.operationId)
      if (!result) {
        const next = structuredClone(snapshot)
        if (args.action === 'plant')
          next.farm!.cropJobs = [
            {
              item_id: args.itemId,
              crop_id: args.kind,
              planted_at: new Date().toISOString(),
              ready_at: new Date(Date.now() + 600000).toISOString(),
            },
          ]
        result = {
          island: next,
          wallet: { gold: gold - args.price, inventory: {} },
          receipt: {
            applied: true,
            operationId: args.operationId,
            quantity: 3,
            delta: -args.price,
          },
        }
        receipts.set(args.operationId, result)
      }
      if (uncertain) {
        uncertain = false
        throw Error('Network timeout')
      }
      setSnapshot(result.island)
      setGold(result.wallet.gold)
      return result
    })
    return (
      <MemoryRouter>
        <FarmView
          snapshot={snapshot}
          storageKey="iso-ui"
          gold={{ wallet: { gold, inventory: {} }, loading: false, error: '' }}
          reload={reload}
          save={async (document, revision, id) => {
            save(document, revision, id)
            const next = { ...snapshot, document, revision: revision + 1 }
            setSnapshot(next)
            return {
              island: next,
              receipt: { operationId: id, revision: revision + 1, applied: true },
            }
          }}
        />
      </MemoryRouter>
    )
  }
  const view = render(<Harness />)
  return { ...view, save, reload }
}
it('shows only white fencing, three core buildings, three animal types and five crop choices', () => {
  harness()
  const nav = screen.getByRole('navigation', { name: '농장 카테고리' })
  fireEvent.click(within(nav).getByRole('button', { name: '장식물' }))
  expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
    '흰 울타리',
  ])
  fireEvent.click(within(nav).getByRole('button', { name: '건물' }))
  expect(
    screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
      .sort(),
  ).toEqual(['농장 창고', '외양간', '텃밭 관리소'])
  fireEvent.click(within(nav).getByRole('button', { name: '동물' }))
  expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
    '닭',
    '젖소',
    '양',
  ])
  fireEvent.click(screen.getByRole('button', { name: '패널 닫기' }))
  fireEvent.keyDown(screen.getAllByRole('button', { name: '밭 선택' })[0], { key: 'Enter' })
  const dialog = screen.getByRole('dialog')
  for (const name of ['당근', '밀', '감자', '옥수수', '딸기'])
    expect(within(dialog).getByRole('button', { name: new RegExp('^' + name) })).toBeTruthy()
})
it.each([
  ['장식물', '흰 울타리', 'farm-white-fence', 40],
  ['동물', '닭', 'farm-chicken', 300],
  ['밭', '밭', 'farm-plot', 10],
  ['땅 추가', '땅 조각', 'land-piece', 50],
])(
  'buys the chosen quantity from %s with the displayed total',
  async (category, name, itemId, price) => {
    const initial = farmFixture({ office: 0, store: 0, barn: 1 })
    harness(initial)
    calls.trade.mockResolvedValue({
      island: initial,
      wallet: { gold: 100000 - price * 3, inventory: {} },
      receipt: { itemIds: [], applied: true },
    })
    fireEvent.click(
      within(screen.getByRole('navigation', { name: '농장 카테고리' })).getByRole('button', {
        name: new RegExp('^' + category),
      }),
    )
    fireEvent.change(screen.getByRole('spinbutton', { name: '구매 수량' }), {
      target: { value: '3' },
    })
    const card = screen.getByRole('heading', { name, level: 3 }).closest('article')!
    const buy = within(card).getByRole('button', {
      name: new RegExp(`${(price * 3).toLocaleString('ko-KR')}.*3개 구매`),
    })
    fireEvent.click(buy)
    await waitFor(() => expect(calls.trade).toHaveBeenCalledTimes(1))
    expect(calls.trade.mock.calls[0][0]).toMatchObject({
      action: 'buy',
      itemId,
      quantity: 3,
      price,
    })
  },
)
it('bounds bulk quantity and keeps unique buildings on the construction flow', () => {
  harness()
  const nav = within(screen.getByRole('navigation', { name: '농장 카테고리' }))
  fireEvent.click(nav.getByRole('button', { name: '장식물' }))
  const input = screen.getByRole('spinbutton', { name: '구매 수량' }) as HTMLInputElement
  fireEvent.change(input, { target: { value: '101' } })
  expect(input.value).toBe('100')
  expect(
    (screen.getByRole('button', { name: '구매 수량 늘리기' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  fireEvent.change(input, { target: { value: '-5' } })
  expect(input.value).toBe('1')
  fireEvent.click(nav.getByRole('button', { name: '건물' }))
  expect(screen.queryByRole('spinbutton', { name: '구매 수량' })).toBeNull()
  expect(screen.getAllByRole('button', { name: '건설·강화' })).toHaveLength(3)
})
it('plants a selected crop with one operation and renders its growth from the server response', async () => {
  harness()
  fireEvent.keyDown(screen.getAllByRole('button', { name: '밭 선택' })[0], { key: 'Enter' })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^당근/ }))
  await waitFor(() => expect(calls.farm).toHaveBeenCalledTimes(1))
  expect(calls.farm.mock.calls[0][0]).toMatchObject({
    action: 'plant',
    kind: 'carrot',
    price: 3,
    quantity: 1,
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(document.querySelector('[data-farm-sprite="carrot"]')).toBeTruthy()
  expect(screen.getByText('99,997')).toBeTruthy()
})
it('retries an uncertain planting with the same operation instead of charging twice', async () => {
  harness(farmFixture(), true)
  fireEvent.keyDown(screen.getAllByRole('button', { name: '밭 선택' })[0], { key: 'Enter' })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^당근/ }))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: '결과 다시 확인' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(calls.farm).toHaveBeenCalledTimes(2)
  expect(calls.farm.mock.calls[0][0]).toEqual(calls.farm.mock.calls[1][0])
  expect(screen.getByText('99,997')).toBeTruthy()
})
it('rotates an animal to another upright sprite and saves the logical rotation', async () => {
  const initial = farmFixture({ office: 0, store: 0, barn: 1 })
  initial.items.push({ id: 'farm-cow~test', type: 'farm-cow', sellPrice: 560 })
  initial.document.layout.push({ id: 'farm-cow~test', x: 23, y: 16, rotation: 0 })
  const { save } = harness(initial)
  fireEvent.click(screen.getByRole('button', { name: '편집' }))
  fireEvent.keyDown(screen.getByRole('button', { name: '젖소 선택' }), { key: 'Enter' })
  fireEvent.click(screen.getByRole('button', { name: '회전', exact: true }))
  expect(document.querySelector('[data-farm-sprite="farm-cow"]')?.getAttribute('data-facing')).toBe(
    '90',
  )
  expect(document.querySelector('[data-farm-sprite="farm-cow"]')?.getAttribute('href')).toContain(
    'farm-cow-1-v1.png',
  )
  await waitFor(() => expect(save).toHaveBeenCalled(), { timeout: 2000 })
  expect(
    save.mock.calls.at(-1)![0].layout.find((p: any) => p.id === 'farm-cow~test').rotation,
  ).toBe(90)
})
it('prevents recovering a planted plot and shows storage capacity before harvesting', () => {
  const initial = farmFixture(),
    id = initial.items.find((i) => i.type === 'farm-plot')!.id
  initial.farm!.cropJobs = [
    {
      item_id: id,
      crop_id: 'carrot',
      planted_at: new Date(Date.now() - 700000).toISOString(),
      ready_at: new Date(Date.now() - 10000).toISOString(),
    },
  ]
  initial.farm!.inventory = { carrot: 20 }
  harness(initial)
  fireEvent.keyDown(screen.getAllByRole('button', { name: '밭 선택' })[0], { key: 'Enter' })
  expect(
    (screen.getByRole('button', { name: '수확하기 · 3개' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(screen.getByText('창고를 비우거나 강화해 주세요.')).toBeTruthy()
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
})
