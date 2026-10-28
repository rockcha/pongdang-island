import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { IslandEditor } from '@/features/my-island/my-island-page'
import { ownedFacilities } from '@/features/my-island/owned-facilities'
import { islandFixture } from './island-fixture'
import type { IslandTradeArgs, IslandTradeResult } from '@/features/my-island/api'
const managed = ownedFacilities(),
  server = { island: islandFixture(), gold: 10000 }
const saves = vi.fn(),
  trades = vi.fn()
let uncertain = false
const receipts = new Map<string, IslandTradeResult>()
function Harness() {
  const [snapshot, setSnapshot] = useState(server.island),
    [gold, setGold] = useState(server.gold)
  return (
    <MemoryRouter>
      <IslandEditor
        storageKey="actual-island-test"
        managed={managed}
        account={{
          snapshot,
          gold,
          walletLoading: false,
          walletError: '',
          reload: async () => {
            setSnapshot(server.island)
            return server.island
          },
          save: async (document, revision, id) => {
            saves(document, revision, id)
            server.island = { ...server.island, document, revision: revision + 1 }
            setSnapshot(server.island)
            return {
              island: server.island,
              receipt: { revision: revision + 1, operationId: id, applied: true },
            }
          },
          trade: async (args, onConfirmed) => {
            trades(args)
            let response = receipts.get(args.operationId)
            if (!response) {
              const ids = Array.from(
                  { length: args.quantity },
                  (_, n) => args.itemId + '~test-' + n,
                ),
                delta = (args.action === 'sell' ? 1 : -1) * args.price * args.quantity
              server.gold += delta
              const material = server.island.catalog.find(
                (item) => item.id === args.itemId && ['floor', 'land'].includes(item.family),
              )
              server.island = material
                ? {
                    ...server.island,
                    stocks: {
                      ...server.island.stocks,
                      [args.itemId]:
                        (server.island.stocks[args.itemId] ?? 0) +
                        (args.action === 'sell' ? -1 : 1) * args.quantity,
                    },
                  }
                : {
                    ...server.island,
                    items: [
                      ...server.island.items,
                      ...ids.map((id) => ({
                        id,
                        type: args.itemId,
                        sellPrice: Math.floor(args.price * 0.7),
                      })),
                    ],
                  }
              response = {
                island: server.island,
                wallet: {
                  gold: server.gold,
                  inventory: {},
                  testClaimed: false,
                  testEnabled: false,
                },
                receipt: {
                  operationId: args.operationId,
                  action: args.action,
                  itemId: args.itemId,
                  itemIds: ids,
                  quantity: args.quantity,
                  delta,
                  applied: true,
                },
              }
              receipts.set(args.operationId, response)
            }
            if (uncertain) {
              uncertain = false
              throw { code: '', message: 'TypeError: Failed to fetch' }
            }
            onConfirmed?.(response)
            setSnapshot(response.island)
            setGold(response.wallet.gold)
            return response
          },
        }}
      />
    </MemoryRouter>
  )
}
beforeEach(() => {
  server.island = islandFixture()
  server.gold = 10000
  receipts.clear()
  uncertain = false
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
  vi.unstubAllGlobals()
  localStorage.clear()
})
const article = (name: string) =>
  screen.getByRole('heading', { name, exact: true }).closest('article')!
async function offerFence() {
  fireEvent.click(screen.getByRole('button', { name: '상점', exact: true }))
  fireEvent.click(within(article('나무 울타리')).getByRole('button', { name: /구매/ }))
  return screen.findByRole('dialog')
}
it('starts with three quiet actions and ignores movement keys until editing', () => {
  render(<Harness />)
  expect(screen.getByRole('navigation', { name: '나의 섬 메뉴' })).toBeTruthy()
  expect(screen.queryByRole('navigation', { name: '섬 꾸미기 도구' })).toBeNull()
  expect(screen.queryByText(/무료 충전/)).toBeNull()
  expect(screen.queryByText('체험 코인')).toBeNull()
  expect(screen.getByRole('button', { name: '보유 골드 10,000' })).toBeTruthy()
  const building = screen.getByRole('button', { name: '아쿠아리움 선택' })
  fireEvent.keyDown(building, { key: 'ArrowRight' })
  expect(saves).not.toHaveBeenCalled()
  fireEvent.keyDown(building, { key: 'Enter' })
  expect(screen.getByRole('button', { name: '들어가기' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: '보관', exact: true })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '시설 선택 닫기' }))
  fireEvent.click(screen.getByRole('button', { name: '꾸미기', exact: true }))
  expect(screen.getByRole('navigation', { name: '섬 꾸미기 도구' })).toBeTruthy()
})
it('confirms an exact quantity, shows a central acquisition and keeps purchases after resetting geometry', async () => {
  render(<Harness />)
  const dialog = await offerFence()
  expect(trades).not.toHaveBeenCalled()
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: '구매 수량' }), {
    target: { value: '3' },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: '120 골드로 구매' }))
  expect(await screen.findByText('나무 울타리 ×3')).toBeTruthy()
  expect(screen.getByText('-120 골드')).toBeTruthy()
  expect(server.gold).toBe(9880)
  fireEvent.click(screen.getByRole('button', { name: '바로 배치' }))
  expect(screen.getByRole('navigation', { name: '섬 꾸미기 도구' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '시설 선택 닫기' }))
  fireEvent.click(screen.getByRole('button', { name: '섬 보기 설정' }))
  fireEvent.click(screen.getByRole('button', { name: '추천 기본 배치' }))
  await waitFor(() => expect(saves).toHaveBeenCalled())
  expect(server.island.items).toHaveLength(15)
  expect(server.gold).toBe(9880)
  expect(localStorage.getItem('actual-island-test')).toBeNull()
})
it('holds the same purchase on a lost response instead of charging again', async () => {
  uncertain = true
  render(<Harness />)
  const dialog = await offerFence()
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: '구매 수량' }), {
    target: { value: '3' },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: '120 골드로 구매' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(server.gold).toBe(9880)
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  fireEvent.click(within(article('나무 울타리')).getByRole('button', { name: /구매/ }))
  expect((screen.getByRole('spinbutton', { name: '구매 수량' }) as HTMLInputElement).value).toBe(
    '3',
  )
  fireEvent.click(screen.getByRole('button', { name: '같은 요청으로 결과 확인' }))
  expect(await screen.findByRole('button', { name: '바로 배치' })).toBeTruthy()
  expect(trades).toHaveBeenCalledTimes(2)
  expect((trades.mock.calls[0][0] as IslandTradeArgs).operationId).toBe(
    trades.mock.calls[1][0].operationId,
  )
  expect(server.gold).toBe(9880)
  expect(server.island.items).toHaveLength(15)
})
it('shows land after tiles and sells only stored material quantities at half price', async () => {
  server.island.stocks['floor-grass'] += 6
  server.island.stocks['land-piece'] += 4
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: '보관함', exact: true }))
  const tabs = screen.getByRole('group', { name: '보관함 분류' })
  expect(
    within(tabs)
      .getAllByRole('button')
      .map((b) => b.textContent),
  ).toEqual(['건물', '장식', '타일', '땅'])
  fireEvent.click(within(tabs).getByRole('button', { name: '타일', exact: true }))
  fireEvent.click(within(article('잔디 타일')).getByRole('button', { name: '잔디 타일 판매 5' }))
  let dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: '판매 수량' }), {
    target: { value: '3' },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: '판매하기' }))
  await waitFor(() => expect(trades).toHaveBeenCalledOnce())
  expect(trades.mock.calls[0][0]).toMatchObject({
    action: 'sell',
    itemId: 'floor-grass',
    quantity: 3,
    price: 5,
  })
  await waitFor(() => expect(screen.getByRole('button', { name: '보유 골드 10,015' })).toBeTruthy())
  fireEvent.click(within(tabs).getByRole('button', { name: '땅', exact: true }))
  expect(screen.queryByText('아직 보관한 물건이 없어요')).toBeNull()
  fireEvent.click(within(article('땅 조각')).getByRole('button', { name: '땅 조각 판매 25' }))
  dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: '판매 수량' }), {
    target: { value: '100' },
  })
  expect(
    (within(dialog).getByRole('spinbutton', { name: '판매 수량' }) as HTMLInputElement).value,
  ).toBe('4')
  fireEvent.click(within(dialog).getByRole('button', { name: '판매하기' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '보유 골드 10,115' })).toBeTruthy())
  expect(server.island.stocks['land-piece']).toBe(775)
})
it('does not recreate sold land through the default layout action', () => {
  server.island.stocks['land-piece'] = 774
  server.island.document.removedLand.push({ x: 6, y: 3 })
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: '꾸미기', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: '섬 보기 설정' }))
  fireEvent.click(screen.getByRole('button', { name: '추천 기본 배치' }))
  expect(screen.getByText(/기본 배치에는 땅 775칸이 필요해요/)).toBeTruthy()
  expect(saves).not.toHaveBeenCalled()
})
it('keeps the aquarium sign caption when the sign is put into storage', async () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: '꾸미기', exact: true }))
  const sign = document.querySelector('[data-island-object="wood-arrow-sign~starter-aquarium"]')!
  fireEvent.keyDown(sign, { key: 'Enter' })
  fireEvent.click(screen.getByRole('button', { name: '보관', exact: true }))
  await waitFor(() => expect(saves).toHaveBeenCalled())
  const saved = saves.mock.calls.at(-1)![0]
  expect(saved.signLabels['wood-arrow-sign~starter-aquarium']).toBe('아쿠아리움')
  expect(saved.layout.some((p: any) => p.id === 'wood-arrow-sign~starter-aquarium')).toBe(false)
})
