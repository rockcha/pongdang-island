import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FarmOffice } from '@/features/my-island/farm-office'
import { canPlace } from '@/features/my-island/island-model'
import { materializeIsland } from '@/features/my-island/island-document'
import { planDecorationPlacement } from '@/features/my-island/island-batch-placement'
import { islandFixture } from './island-fixture'
import type { IslandTradeArgs } from '@/features/my-island/api'
afterEach(() => {
  cleanup()
  localStorage.clear()
})
function harness(uncertain = false) {
  const purchase = vi.fn(),
    before = vi.fn(async () => {}),
    place = vi.fn(),
    receipts = new Map()
  function Harness() {
    const [snapshot, setSnapshot] = useState({
        ...islandFixture(true),
        farm: { officeLevel: 0, plotLimit: 4, nextCost: 5000 as number | null },
      }),
      [gold, setGold] = useState(100000)
    return (
      <FarmOffice
        open
        onOpenChange={() => {}}
        snapshot={snapshot}
        gold={gold}
        walletLoading={false}
        walletError=""
        storageKey="farm-office-test"
        usedPlots={4}
        beforePurchase={before}
        reload={async () => snapshot}
        onPlace={place}
        trade={async (args: IslandTradeArgs, onConfirmed) => {
          purchase(args)
          let result = receipts.get(args.operationId)
          if (!result) {
            const level = snapshot.farm.officeLevel + 1
            result = {
              island: {
                ...snapshot,
                items: snapshot.items.some((i) => i.type === 'farm-office')
                  ? snapshot.items
                  : [
                      ...snapshot.items,
                      { id: 'farm-office~one', type: 'farm-office', sellPrice: 0 },
                    ],
                farm: {
                  officeLevel: level,
                  plotLimit: [4, 9, 16, 25, 36, 49][level],
                  nextCost: level === 5 ? null : (level + 1) * 5000,
                },
              },
              wallet: { gold: gold - args.price },
              receipt: { operationId: args.operationId, applied: true },
            }
            receipts.set(args.operationId, result)
          }
          if (uncertain) {
            uncertain = false
            throw Error('Network error')
          }
          onConfirmed?.(result)
          setSnapshot(result.island)
          setGold(result.wallet.gold)
          return result
        }}
      />
    )
  }
  render(<Harness />)
  return { purchase, before, place }
}
it('builds and upgrades through all five levels while retaining its name and fixed footprint', async () => {
  const { purchase, before, place } = harness()
  for (const [index, cost] of [5000, 10000, 15000, 20000, 25000].entries()) {
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`${cost.toLocaleString('ko-KR')}.*${index ? '강화하기' : '건설하기'}`),
      }),
    )
    await waitFor(() => expect(purchase).toHaveBeenCalledTimes(index + 1))
    await waitFor(() =>
      expect(
        document
          .querySelector('.farm-office-portrait [data-farm-office-level]')
          ?.getAttribute('data-farm-office-level'),
      ).toBe(String(index + 1)),
    )
    expect(screen.getByRole('heading', { name: /텃밭 관리소/ })).toBeTruthy()
  }
  expect(before).toHaveBeenCalledTimes(5)
  expect(screen.getByText('최고 레벨이에요')).toBeTruthy()
  expect(screen.getByText('4 / 49칸')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '농장에 배치하기' }))
  expect(place).toHaveBeenCalledWith('farm-office~one')
})
it('reuses an uncertain operation instead of charging for the next level', async () => {
  const { purchase, before } = harness(true)
  fireEvent.click(screen.getByRole('button', { name: /5,000.*건설하기/ }))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: '결과 다시 확인' }))
  await waitFor(() => expect(screen.getByText('4 / 9칸')).toBeTruthy())
  expect(purchase).toHaveBeenCalledTimes(2)
  expect(purchase.mock.calls[0][0]).toEqual(purchase.mock.calls[1][0])
  expect(before).toHaveBeenCalledTimes(1)
  expect(localStorage.getItem('farm-office-test:office-purchase')).toBeNull()
})
it('limits single and rectangular placement while allowing an existing plot to move', () => {
  const snapshot = islandFixture(true),
    state = { ...materializeIsland(snapshot), farmPlotLimit: 4 }
  state.owned.push('farm-plot~extra')
  expect(
    canPlace(
      state.layout,
      { id: 'farm-plot~extra', x: 14, y: 13 },
      state.land,
      state.removedLand,
      4,
    ),
  ).toBe(false)
  const existing = state.layout.find((p) => p.id.startsWith('farm-plot~'))!
  expect(
    canPlace(state.layout, { ...existing, x: 14, y: 13 }, state.land, state.removedLand, 4),
  ).toBe(true)
  expect(
    planDecorationPlacement(state, 'farm-plot', { x: 14, y: 13 }, { x: 16, y: 14 }).placements,
  ).toEqual([])
  expect(
    planDecorationPlacement(
      { ...state, farmPlotLimit: 9 },
      'farm-plot',
      { x: 14, y: 13 },
      { x: 16, y: 14 },
    ).placements,
  ).toHaveLength(1)
})
