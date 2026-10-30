import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ rpc: vi.fn(), purchase: vi.fn(), sale: vi.fn() }))
vi.mock('@/lib/client', () => ({ createClient: () => ({ rpc: mock.rpc }) }))
vi.mock('@/features/gold/purchase-sound', () => ({
  playPurchaseSound: mock.purchase,
  playSaleSound: mock.sale,
}))
import { farmAction } from '@/features/farm/api'
import { setQueryAccount, appQueryClient, accountQueryKey } from '@/lib/account-cache'
import { farmFixture } from './farm-fixture'
beforeEach(() => setQueryAccount('one'))
afterEach(() => {
  setQueryAccount(null)
  appQueryClient.clear()
  vi.resetAllMocks()
})
it('publishes the confirmed farm and wallet snapshots without another read', async () => {
  const island = farmFixture(),
    wallet = { gold: 997, inventory: {} },
    operation = '00000000-0000-4000-8000-000000000001'
  mock.rpc.mockResolvedValue({
    data: {
      island,
      wallet,
      receipt: { operationId: operation, applied: true, quantity: 3, delta: -3 },
    },
    error: null,
  })
  await farmAction({
    action: 'plant',
    itemId: 'farm-plot~one',
    kind: 'carrot',
    quantity: 1,
    price: 3,
    operationId: operation,
  })
  expect(mock.rpc).toHaveBeenCalledWith('farm_action', {
    p_action: 'plant',
    p_item_id: 'farm-plot~one',
    p_kind: 'carrot',
    p_quantity: 1,
    p_expected_price: 3,
    p_operation_id: operation,
  })
  expect(mock.rpc).toHaveBeenCalledTimes(1)
  expect(appQueryClient.getQueryData(accountQueryKey('one', 'island'))).toEqual(island)
  expect(appQueryClient.getQueryData(accountQueryKey('one', 'wallet'))).toEqual(wallet)
})
it('rejects a late A→B→A response without publishing the old harvest or playing sounds', async () => {
  let finish!: (value: unknown) => void
  mock.rpc.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const operation = '00000000-0000-4000-8000-000000000002'
  const work = farmAction({
    action: 'sell',
    itemId: 'carrot',
    kind: '',
    quantity: 3,
    price: 3,
    operationId: operation,
  })
  const rejected = expect(work).rejects.toThrow('ACCOUNT_CHANGED')
  setQueryAccount('two')
  setQueryAccount('one')
  finish({
    data: { island: farmFixture(), wallet: { gold: 1009, inventory: {} }, receipt: {} },
    error: null,
  })
  await rejected
  expect(appQueryClient.getQueryData(accountQueryKey('one', 'wallet'))).toBeUndefined()
  expect(appQueryClient.getQueryData(accountQueryKey('one', 'island'))).toBeUndefined()
  expect(mock.sale).not.toHaveBeenCalled()
})
