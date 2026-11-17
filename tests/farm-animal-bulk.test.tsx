import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { initialTopview, MAP_W, MAP_H, cellKey } from '@/features/farm/topview-model'
import { simulateFarm, farmAnimalHousing, farmLimits } from '@/features/farm/farm-simulation'
import { FarmAnimalPurchase } from '@/features/farm/animal-purchase'
import { FarmAnimalStatus } from '@/features/farm/animal-status'
import { farmAnimals, type FarmAnimal } from '@/features/farm/animal-catalog'
import { applyFarmCommand, validFarmState } from '@/features/farm/account-engine'

afterEach(cleanup)
function fixture() {
  const s = initialTopview()
  s.gold = 50000
  s.stored = []
  s.paths = []
  s.nextId = 100
  s.land = Array.from({ length: MAP_W * MAP_H }, (_, i) =>
    cellKey(i % MAP_W, Math.floor(i / MAP_W)),
  )
  s.objects = [
    { id: 1, kind: 'warehouse', x: 1, y: 1 },
    { id: 2, kind: 'livestockOffice', x: 1, y: 5 },
    { id: 3, kind: 'livestockOffice', x: 4, y: 5 },
    { id: 4, kind: 'livestockOffice', x: 7, y: 5 },
    { id: 5, kind: 'coop', x: 10, y: 5 },
    { id: 6, kind: 'coop', x: 14, y: 5 },
    { id: 7, kind: 'barn', x: 18, y: 5 },
  ]
  return s
}
it.each(['chicken', 'duck', 'cow', 'sheep'] as FarmAnimal[])(
  'charges five %s, waits fifty seconds and claims five animals exactly once',
  (animal) => {
    const s = fixture(),
      id = farmAnimals[animal].housing === 'coop' ? 5 : 7
    const bought = applyFarmCommand(
      s,
      { type: 'simulate', id, action: { type: 'animal', animal, quantity: 5 } },
      1000,
    )
    expect(bought.gold).toBe(s.gold - farmAnimals[animal].price * 5)
    expect(bought.simulation.animalPurchaseJobs[id]).toMatchObject({
      animal,
      quantity: 5,
      startedAt: 1000,
      readyAt: 51000,
    })
    expect(farmAnimalHousing(bought, animal)).toMatchObject({ pending: 5, total: 5, capacity: 6 })
    expect(farmLimits(bought).pendingAnimals).toBe(5)
    expect(() =>
      applyFarmCommand(
        bought,
        { type: 'simulate', id, action: { type: 'completeAnimalPurchase' } },
        50999,
      ),
    ).toThrow('아직 동물을 준비하고 있어요.')
    const claimed = applyFarmCommand(
      bought,
      { type: 'simulate', id, action: { type: 'completeAnimalPurchase' } },
      51000,
    )
    expect(claimed.stored).toEqual(Array(5).fill(animal))
    expect(claimed.gold).toBe(bought.gold)
    expect(farmAnimalHousing(claimed, animal)).toMatchObject({ pending: 0, stored: 5, total: 5 })
    expect(() =>
      applyFarmCommand(
        claimed,
        { type: 'simulate', id, action: { type: 'completeAnimalPurchase' } },
        52000,
      ),
    ).toThrow('아직 동물을 준비하고 있어요.')
    expect(validFarmState(claimed)).toBe(true)
  },
)
it.each([0, -1, 6, 1.5, NaN, Infinity, '5', null])(
  'rejects invalid quantity %s without spending gold or reserving capacity',
  (quantity) => {
    const s = fixture()
    expect(
      simulateFarm(s, 5, { type: 'animal', animal: 'chicken', quantity: quantity as number }, 0)
        .state,
    ).toBe(s)
  },
)
it('reserves all pending animals across buildings and rejects unaffordable or over-capacity batches atomically', () => {
  const s = fixture(),
    bought = simulateFarm(s, 5, { type: 'animal', animal: 'chicken', quantity: 5 }, 0).state
  expect(simulateFarm(bought, 5, { type: 'animal', animal: 'duck' }, 1).state).toBe(bought)
  expect(simulateFarm(bought, 6, { type: 'animal', animal: 'duck', quantity: 2 }, 1).state).toBe(
    bought,
  )
  const full = simulateFarm(bought, 6, { type: 'animal', animal: 'duck' }, 1).state
  expect(farmLimits(full).totalAnimals).toBe(6)
  expect(simulateFarm(full, 7, { type: 'animal', animal: 'cow' }, 2).state).toBe(full)
  const poor = { ...s, gold: farmAnimals.chicken.price * 5 - 1 }
  expect(simulateFarm(poor, 5, { type: 'animal', animal: 'chicken', quantity: 5 }, 0).state).toBe(
    poor,
  )
})
it('retains legacy single-animal jobs and accepts old single-animal purchase commands', () => {
  const s = fixture(),
    bought = simulateFarm(s, 5, { type: 'animal', animal: 'chicken' }, 0).state
  expect(bought.simulation.animalPurchaseJobs[5].readyAt).toBe(10000)
  expect(bought.simulation.animalPurchaseJobs[5].quantity).toBeUndefined()
  expect(simulateFarm(bought, 5, { type: 'completeAnimalPurchase' }, 10000).state.stored).toEqual([
    'chicken',
  ])
})
it('shows one minimal quantity control with total price and multiplied preparation time', () => {
  const onAction = vi.fn()
  render(
    <FarmAnimalPurchase buildingId={5} kind="coop" state={fixture()} now={0} onAction={onAction} />,
  )
  fireEvent.change(screen.getByRole('spinbutton', { name: /구매 수량/ }), {
    target: { value: '5' },
  })
  expect(screen.getByText('5마리 준비 50초 · 완료 후 함께 수령')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '닭 5마리 구매 · 3,000골드' }))
  expect(onAction).toHaveBeenCalledWith({ type: 'animal', animal: 'chicken', quantity: 5 })
  expect(screen.getByRole('button', { name: '동물 구매 수량 늘리기' })).toHaveProperty(
    'disabled',
    true,
  )
})
it('clamps the quantity when the wallet or shared remaining capacity shrinks', () => {
  const s = fixture(),
    onAction = vi.fn()
  const { rerender } = render(
    <FarmAnimalPurchase buildingId={6} kind="coop" state={s} now={0} onAction={onAction} />,
  )
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } })
  const other = simulateFarm(s, 5, { type: 'animal', animal: 'chicken', quantity: 4 }, 0).state
  rerender(
    <FarmAnimalPurchase buildingId={6} kind="coop" state={other} now={0} onAction={onAction} />,
  )
  expect(screen.getByRole('spinbutton')).toHaveProperty('value', '2')
  rerender(
    <FarmAnimalPurchase
      buildingId={6}
      kind="coop"
      state={{ ...other, gold: 600 }}
      now={0}
      onAction={onAction}
    />,
  )
  expect(screen.getByRole('spinbutton')).toHaveProperty('value', '1')
  rerender(
    <FarmAnimalPurchase
      buildingId={6}
      kind="coop"
      state={{ ...other, gold: 599 }}
      now={0}
      onAction={onAction}
    />,
  )
  expect(screen.getByRole('button', { name: '닭 구매 · 600골드' })).toHaveProperty('disabled', true)
})
it('uses the entire batch duration in both progress indicators and displays the map quantity badge', () => {
  const s = simulateFarm(fixture(), 5, { type: 'animal', animal: 'chicken', quantity: 5 }, 0).state,
    onAction = vi.fn()
  const { unmount } = render(
    <FarmAnimalPurchase buildingId={5} kind="coop" state={s} now={25000} onAction={onAction} />,
  )
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50')
  expect(screen.getByRole('button', { name: '동물 준비 중…' })).toHaveProperty('disabled', true)
  unmount()
  render(
    <svg>
      <FarmAnimalStatus
        object={s.objects.find((o) => o.id === 5)!}
        purchase="chicken"
        purchaseCount={5}
        readyAt={50000}
        now={25000}
      />
    </svg>,
  )
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50')
  expect(screen.getByText('×5')).toBeTruthy()
})
