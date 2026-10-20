import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { FishingTripDialog } from '@/features/fishing/fishing-trip-dialog'
import { loadTripStorage } from '@/features/fishing/fishing-trip-storage'
import { loadCollectibleStorage } from '@/features/aquarium/api'
import type { FishingAttempt } from '@/features/fishing/api'
import type { OwnedCollectible } from '@/features/collection/api'

const mock = vi.hoisted(() => ({ transact: vi.fn(), storage: vi.fn() }))
vi.mock('@/features/gold/gold-provider', () => ({ useGold: () => ({ transact: mock.transact, busy: false, loading: false }), GoldIcon: () => null }))
vi.mock('@/features/aquarium/api', () => ({ loadCollectibleStorage: mock.storage }))
vi.mock('@/features/collection/collectible-thumbnail', () => ({ CollectibleThumbnail: () => null }))
const item = (id: string, species = 'fish') => ({ id, species_id: species, tank_id: null, acquired_at: '2026-10-21T01:01:00Z', species: { id: species, name: species === 'fish' ? '퐁이 게' : '복어', rarity: 'common', kind: 'fish', sell_price: 30, thumbnail_path: '/fish.png' } }) as OwnedCollectible
const catches = ['a', 'b', 'c'].map(id => ({ collectible_id: id, created_at: '2026-10-21T01:00:00Z' })) as FishingAttempt[]
beforeEach(() => { vi.clearAllMocks(); mock.transact.mockResolvedValue(undefined); mock.storage.mockResolvedValue({ items: [item('a'), item('b'), item('c', 'puffer'), item('not-this-trip')], total: 4 }) })
afterEach(cleanup)
it('selects quantities across species and confirms before selling only the selected real IDs', async () => {
  const onSold = vi.fn()
  render(<FishingTripDialog catches={catches} disabled={false} onSold={onSold} />)
  fireEvent.click(screen.getByRole('button', { name: '보관함 · 3개' }))
  fireEvent.click(await screen.findByRole('button', { name: '퐁이 게 선택' }))
  fireEvent.click(screen.getByRole('button', { name: '복어 선택' }))
  expect(screen.getByText('2개 선택 · 최대 100개')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '선택 판매' }))
  expect(mock.transact).not.toHaveBeenCalled()
  expect(screen.getByText('선택한 개체 2개를 판매할까요?')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '판매하기' }))
  await waitFor(() => expect(mock.transact).toHaveBeenCalledWith({ type: 'sell', id: 'collectibles:a,c' }))
  expect(onSold).toHaveBeenCalledWith(['a', 'c'])
})
it('keeps the exact sale available for retry after a transport error', async () => {
  mock.transact.mockRejectedValueOnce(new Error('연결을 확인해주세요.'))
  const onSold = vi.fn()
  render(<FishingTripDialog catches={catches} disabled={false} onSold={onSold} />)
  fireEvent.click(screen.getByRole('button', { name: '보관함 · 3개' }))
  fireEvent.click(await screen.findByRole('button', { name: '퐁이 게 선택' }))
  fireEvent.click(screen.getByRole('button', { name: '선택 판매' }))
  fireEvent.click(screen.getByRole('button', { name: '판매하기' }))
  await screen.findByText('연결을 확인해주세요.')
  expect(onSold).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '판매하기' }))
  await waitFor(() => expect(onSold).toHaveBeenCalledWith(['a']))
  expect(mock.transact.mock.calls[0]).toEqual(mock.transact.mock.calls[1])
})
it('resolves only actual trip storage and stops before scanning old inventory', async () => {
  mock.storage.mockResolvedValue({ items: [item('a'), { ...item('old'), acquired_at: '2026-10-20T01:00:00Z' }], total: 5000 })
  const actual = await loadTripStorage(catches)
  expect(actual.map(i => i.id)).toEqual(['a'])
  expect(loadCollectibleStorage).toHaveBeenCalledTimes(1)
})
it('limits bulk selection to 100 and lets the user clear it', async () => {
  const rows=Array.from({length:101},(_,i)=>item(`bulk-${i}`))
  const trip=rows.map(row=>({collectible_id:row.id,created_at:'2026-10-21T01:00:00Z'})) as FishingAttempt[]
  mock.storage.mockResolvedValue({items:rows,total:101})
  render(<FishingTripDialog catches={trip} disabled={false} onSold={vi.fn()} />)
  fireEvent.click(screen.getByRole('button',{name:'보관함 · 101개'}))
  await screen.findByRole('button',{name:'퐁이 게 선택'})
  fireEvent.click(screen.getByRole('button',{name:'전체 선택'}))
  expect(screen.getByText('100개 선택 · 최대 100개')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'선택 해제'}))
  expect(screen.getByText('0개 선택 · 최대 100개')).toBeTruthy()
})
