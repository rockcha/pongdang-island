import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StoragePage } from '@/features/aquarium/storage-page'

const mock = vi.hoisted(() => ({ load: vi.fn(), storage: vi.fn(), move: vi.fn(), transact: vi.fn() }))
vi.mock('@/features/aquarium/api', () => ({ loadAquarium: mock.load, loadCollectibleStorage: mock.storage, moveCollectibles: mock.move, storageError: () => '이동 실패' }))
vi.mock('@/features/gold/gold-provider', () => ({ useGold: () => ({ busy: false, loading: false, transact: mock.transact }), GoldIcon: () => null }))
vi.mock('@/features/collection/collectible-thumbnail', () => ({ CollectibleThumbnail: () => null }))
vi.mock('@/features/merchant/use-daily-order-species', () => ({ useDailyOrderSpecies: () => new Set() }))
vi.mock('@/features/gifts/send-gift-dialog', () => ({ SendGiftDialog: () => <button>선물</button> }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('shows storage without duplicate title or aquarium placement and keeps selling available', async () => {
  const item = { id: 'owned-fish', species_id: 'fish', species: { id: 'fish', name: '멸치', kind: 'fish', rarity: 'common', sell_price: 40 } }
  mock.load.mockResolvedValue({ storageCount: 1, tankCapacity: 50, inhabitants: [], tanks: [{ id: 'one', name: '첫 어항' }, { id: 'two', name: '둘째 어항' }] })
  mock.storage.mockResolvedValue({ items: [item], total: 1, pageSize: 50 })
  mock.move.mockResolvedValue(undefined)
  render(<StoragePage />)
  await screen.findByRole('button', { name: '멸치 선택' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('button', { name: /보관함/ })).toBeNull()
  expect(screen.queryByRole('heading', { name: '보관함' })).toBeNull()
  expect(screen.queryByRole('combobox', { name: '개체를 넣을 어항' })).toBeNull()
  expect(screen.getByRole('group', { name: '보관함 분류' }).className).toContain('p-2')
  fireEvent.click(screen.getByRole('button', { name: '멸치 선택' }))
  expect(screen.queryByRole('button', { name: '1개 어항에 넣기' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '선택한 개체 판매 40 골드' }))
  fireEvent.click(screen.getByRole('button', { name: '판매하기' }))
  await waitFor(() => expect(mock.transact).toHaveBeenCalledWith({ type: 'sell', id: 'collectibles:owned-fish' }))
  expect(mock.move).not.toHaveBeenCalled()
})

it('recovers when the page metadata request fails', async () => {
  mock.load.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ storageCount: 0, inhabitants: [], tanks: [] })
  mock.storage.mockResolvedValue({ items: [], total: 0, pageSize: 50 })
  render(<StoragePage />)
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  expect(await screen.findByText('보관함이 비어 있어요.')).toBeTruthy()
})
