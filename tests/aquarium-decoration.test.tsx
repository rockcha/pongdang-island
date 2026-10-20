import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AquariumView } from '../src/features/aquarium/aquarium-view'
import type { OwnedCollectible } from '../src/features/collection/api'

const mock = vi.hoisted(() => ({ items: [] as unknown[] }))
vi.mock('../src/features/aquarium/tank-inhabitants', () => ({
  TankInhabitants: ({
    items,
    onSelectDecoration,
    onBackgroundTap,
  }: {
    items: OwnedCollectible[]
    onSelectDecoration: (id: string) => void
    onBackgroundTap: () => void
  }) => {
    mock.items = items
    return (
      <>
        <button onClick={() => onSelectDecoration(items[0].id)}>수조 장식물 클릭</button>
        <button onClick={onBackgroundTap}>수조 배경 클릭</button>
      </>
    )
  },
}))
vi.mock('../src/features/aquarium/aquarium-inventory-dialog', () => ({
  AquariumInventoryDialog: () => null,
}))
vi.mock('../src/features/aquarium/api', () => ({ backgroundUrl: (path: string) => path }))
const decoration: OwnedCollectible = {
  id: 'starfish',
  species_id: 'starfish',
  tank_id: 'tank',
  animation_seed: 0,
  position_x: 0.2,
  position_y: 0.3,
  rotation: 45,
  scale: 0.5,
  acquired_at: '',
  species: {
    id: 'starfish',
    kind: 'decoration',
    name: '살구 불가사리',
    description: '유지할 설명',
    swim_y_min: null,
    swim_y_max: null,
    speed: 0,
    size: 52,
    rarity: 'common',
    sprite_sheet_path: null,
    thumbnail_path: 'decorations/normal/apricot-starfish_thumbnail.png',
    sell_price: 35,
  },
}
afterEach(cleanup)
it('switches tanks with visible arrows and keyboard while respecting the first and last tank', () => {
  const buy = vi.fn(),
    navigate = vi.fn()
  const { rerender } = render(
    <AquariumView
      name="내 어항"
      items={[]}
      busy={false}
      onPlace={() => {}}
      onSell={async () => {}}
      navigation={{ index: 0, count: 2, onChange: navigate }}
      purchase={{ price: 200, disabled: false, onBuy: buy }}
    />,
  )
  expect(screen.getByLabelText('현재 어항').textContent?.replace(/\s/g, '')).toBe('1/2')
  expect(screen.getByRole('button', { name: '이전 어항' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '다음 어항' }))
  expect(navigate).toHaveBeenCalledWith('next')
  expect(screen.queryByRole('button', { name: '어항 추가' })).toBeNull()
  expect(screen.getByRole('button', { name: '친구 어항' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '어항 관리' })).toBeTruthy()
  fireEvent.keyDown(screen.getByTestId('aquarium-glass'), { key: 'ArrowRight' })
  expect(navigate).toHaveBeenCalledWith('next')
  rerender(
    <AquariumView
      name="두 번째 어항"
      items={[]}
      busy={false}
      onPlace={() => {}}
      onSell={async () => {}}
      navigation={{ index: 1, count: 2, onChange: navigate }}
    />,
  )
  expect(screen.getByRole('button', { name: '다음 어항' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '이전 어항' }))
  expect(navigate).toHaveBeenLastCalledWith('previous')
})
it('auto-saves edits and dismisses the toolbar on background tap without cancelling the save', async () => {
  let finish!: () => void
  const arrange = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  render(
    <AquariumView
      name="내 어항"
      items={[decoration]}
      busy={false}
      onPlace={() => {}}
      onArrange={arrange}
      onSell={async () => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '수조 장식물 클릭' }))
  fireEvent.click(screen.getByRole('button', { name: '크기 키우기' }))
  expect(mock.items[0]).toMatchObject({ scale: 0.6 })
  expect(arrange).toHaveBeenCalledWith(
    'starfish',
    expect.objectContaining({ rotation: 45, scale: 0.6, flipped: false }),
  )
  fireEvent.click(screen.getByRole('button', { name: '수조 배경 클릭' }))
  expect(screen.queryByRole('region', { name: '살구 불가사리 꾸미기' })).toBeNull()
  finish()
  await waitFor(() => expect(arrange).toHaveBeenCalledOnce())
})
it('restores the last position and size when automatic saving fails', async () => {
  const arrange = vi.fn(async () => {
    throw new Error('offline')
  })
  render(
    <AquariumView
      name="내 어항"
      items={[decoration]}
      busy={false}
      onPlace={() => {}}
      onArrange={arrange}
      onSell={async () => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '수조 장식물 클릭' }))
  fireEvent.click(screen.getByRole('button', { name: '크기 키우기' }))
  await waitFor(() => expect(mock.items[0]).toMatchObject({ scale: 0.5 }))
})

it('preserves the center and toolbar anchor while scaling', async () => {
  const arrange = vi.fn(async () => {})
  render(
    <AquariumView
      name="어항"
      items={[decoration]}
      busy={false}
      onPlace={() => {}}
      onArrange={arrange}
      onSell={async () => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '수조 장식물 클릭' }))
  const toolbar = screen.getByRole('region', { name: '살구 불가사리 꾸미기' }).parentElement!
  const before = toolbar.getAttribute('style')
  fireEvent.click(screen.getByRole('button', { name: '크기 키우기' }))
  await waitFor(() => expect(arrange).toHaveBeenCalledOnce())
  expect(toolbar.getAttribute('style')).toBe(before)
  const next = arrange.mock.calls[0] as unknown as [
    string,
    { position_x: number; position_y: number; scale: number },
  ]
  const factor = Math.SQRT2,
    oldSize = 26,
    newSize = 31.2
  expect(next[1].position_x * (320 - newSize * factor) + (newSize * factor) / 2).toBeCloseTo(
    0.2 * (320 - oldSize * factor) + (oldSize * factor) / 2,
  )
  expect(next[1].position_y * (560 - newSize * factor) + (newSize * factor) / 2).toBeCloseTo(
    0.3 * (560 - oldSize * factor) + (oldSize * factor) / 2,
  )
})
