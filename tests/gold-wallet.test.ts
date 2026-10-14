import { describe, expect, it } from 'vitest'
import { emptyWallet, trade } from '@/features/gold/wallet'

describe('demo shop transactions', () => {
  it('charges, buys and sells while preserving inventory and balance', () => {
    const charged = trade(emptyWallet(), { type: 'charge' })
    expect(charged.delta).toBe(1000)
    const bought = trade(charged.wallet, { type: 'buy', id: 'bait' })
    expect(bought).toEqual({ wallet: { gold: 970, inventory: { bait: 1 } }, delta: -30 })
    const sold = trade(bought.wallet, { type: 'sell', id: 'bait' })
    expect(sold).toEqual({ wallet: { gold: 988, inventory: { bait: 0 } }, delta: 18 })
    expect(charged.wallet.inventory).toEqual({})
  })
  it('rejects insufficient gold and selling absent inventory', () => {
    expect(() => trade(emptyWallet(), { type: 'buy', id: 'shell' })).toThrow()
    expect(() => trade(emptyWallet(), { type: 'sell', id: 'shell' })).toThrow()
    expect(() => trade(emptyWallet(), { type: 'buy', id: 'missing' })).toThrow()
  })
})
