import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const { rpc, purchase, sale } = vi.hoisted(() => ({
  rpc: vi.fn(),
  purchase: vi.fn(),
  sale: vi.fn(),
}))
vi.mock('@/lib/client', () => ({ createClient: () => ({ rpc }) }))
vi.mock('@/features/gold/purchase-sound', () => ({
  playPurchaseSound: purchase,
  playSaleSound: sale,
}))
import { readIsland, tradeIsland, saveIsland, ISLAND_GOLD_EFFECT } from '@/features/my-island/api'
import { setQueryAccount, appQueryClient, accountQueryKey } from '@/lib/account-cache'
import { islandFixture } from './island-fixture'
beforeEach(() => setQueryAccount('one'))
afterEach(() => {
  setQueryAccount(null)
  appQueryClient.clear()
  vi.resetAllMocks()
})
it('passes the shared read cancellation signal to Supabase', async () => {
  const snapshot = islandFixture(),
    abortSignal = vi.fn().mockResolvedValue({ data: snapshot, error: null })
  rpc.mockReturnValue({ abortSignal })
  const signal = new AbortController().signal
  expect(await readIsland(signal)).toEqual(snapshot)
  expect(abortSignal).toHaveBeenCalledWith(signal)
})
it('publishes complete purchase snapshots and emits the acquisition suppression before the wallet changes', async () => {
  const island = islandFixture(),
    wallet = { gold: 960, inventory: {}, testClaimed: false, testEnabled: false },
    receipt = {
      operationId: 'id',
      delta: -40,
      applied: true,
      itemIds: ['wood-fence~id'],
      quantity: 1,
      action: 'buy',
      itemId: 'wood-fence',
    }
  rpc.mockResolvedValue({ data: { island, wallet, receipt }, error: null })
  const effect = vi.fn(() =>
    expect(appQueryClient.getQueryData(accountQueryKey('one', 'wallet'))).toBeUndefined(),
  )
  window.addEventListener(ISLAND_GOLD_EFFECT, effect)
  try {
    await tradeIsland(
      { action: 'buy', itemId: 'wood-fence', quantity: 1, price: 40, operationId: 'id' },
      () => true,
    )
  } finally {
    window.removeEventListener(ISLAND_GOLD_EFFECT, effect)
  }
  expect(effect).toHaveBeenCalledOnce()
  expect(purchase).toHaveBeenCalledWith('id')
  expect(appQueryClient.getQueryData(accountQueryKey('one', 'wallet'))).toEqual(wallet)
  expect(appQueryClient.getQueryData(accountQueryKey('one', 'island'))).toEqual(island)
  expect(rpc).toHaveBeenCalledOnce()
})
it('rejects an A→B→A late response without receipts, effects, sounds or cache changes', async () => {
  let finish!: (value: unknown) => void
  rpc.mockReturnValue(new Promise((r) => (finish = r)))
  const shown = vi.fn()
  const work = tradeIsland(
      { action: 'buy', itemId: 'bench', quantity: 1, price: 100, operationId: 'id' },
      shown,
    ),
    rejected = expect(work).rejects.toThrow('ACCOUNT_CHANGED')
  setQueryAccount('two')
  setQueryAccount('one')
  finish({ data: { island: islandFixture(), wallet: { gold: 900 }, receipt: {} }, error: null })
  await rejected
  expect(shown).not.toHaveBeenCalled()
  expect(purchase).not.toHaveBeenCalled()
  expect(appQueryClient.getQueryData(accountQueryKey('one', 'wallet'))).toBeUndefined()
})
it('saves through the command boundary and publishes without another read', async () => {
  const island = islandFixture()
  rpc.mockResolvedValue({
    data: { island, receipt: { revision: 0, applied: false, operationId: 'id' } },
    error: null,
  })
  await saveIsland(island.document, 0, 'id')
  expect(rpc).toHaveBeenCalledOnce()
  expect(appQueryClient.getQueryData(accountQueryKey('one', 'island'))).toEqual(island)
})
it('refreshes prices and the wallet after a definitive rejection without retrying the command', async () => {
  appQueryClient.setQueryData(accountQueryKey('one', 'island'), islandFixture())
  appQueryClient.setQueryData(accountQueryKey('one', 'wallet'), { gold: 1000 })
  rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'ISLAND_PRICE_CHANGED' } })
  await expect(
    tradeIsland({ action: 'buy', itemId: 'bench', quantity: 1, price: 100, operationId: 'id' }),
  ).rejects.toMatchObject({ message: 'ISLAND_PRICE_CHANGED' })
  expect(rpc).toHaveBeenCalledOnce()
  expect(appQueryClient.getQueryState(accountQueryKey('one', 'island'))?.isInvalidated).toBe(true)
  expect(appQueryClient.getQueryState(accountQueryKey('one', 'wallet'))?.isInvalidated).toBe(true)
  expect(purchase).not.toHaveBeenCalled()
})
