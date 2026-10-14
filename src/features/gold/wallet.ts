export const products = [
  { id: 'bait', name: '퐁당 지렁이', description: '퐁당섬에서만 서식하는 흔한 선홍빛 지렁이', icon: '🪱', buy: 30, sell: 18 },
  { id: 'shell', name: '진주 조개', description: '바다에서 건져 올린 반짝임', icon: '🐚', buy: 300, sell: 180 },
] as const
export type Wallet = { gold: number; inventory: Record<string, number> }
export type Trade = { type: 'charge' } | { type: 'buy' | 'sell'; id: string }
export const emptyWallet = (): Wallet => ({ gold: 0, inventory: {} })
export function trade(wallet: Wallet, action: Trade): { wallet: Wallet; delta: number } {
  if (action.type === 'charge') {
    if (wallet.gold > 1_000_000_000 - 1000) throw new Error('테스트 골드 보유 한도에 도달했어요.')
    return { wallet: { ...wallet, gold: wallet.gold + 1000 }, delta: 1000 }
  }
  const item = products.find(item => item.id === action.id)
  if (!item) throw new Error('상품을 찾을 수 없어요.')
  const count = wallet.inventory[item.id] ?? 0
  if (action.type === 'buy' && wallet.gold < item.buy) throw new Error('골드가 부족해요. 테스트 충전을 이용해주세요.')
  if (action.type === 'sell' && count < 1) throw new Error('판매할 아이템이 없어요.')
  const delta = action.type === 'buy' ? -item.buy : item.sell
  return { wallet: { gold: wallet.gold + delta, inventory: { ...wallet.inventory, [item.id]: count + (action.type === 'buy' ? 1 : -1) } }, delta }
}
export function readWallet(key: string): Wallet {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (!value || !Number.isSafeInteger(value.gold) || value.gold < 0 || value.gold > 1_000_000_000 || !value.inventory || typeof value.inventory !== 'object') return emptyWallet()
    const inventory: Record<string, number> = {}
    for (const item of products) {
      const count = value.inventory[item.id] ?? 0
      if (!Number.isSafeInteger(count) || count < 0) return emptyWallet()
      inventory[item.id] = count
    }
    return { gold: value.gold, inventory }
  } catch { return emptyWallet() }
}
