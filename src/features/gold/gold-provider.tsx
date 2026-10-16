import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider'
import { emptyWallet } from './wallet'
import { goldError, loadGold, transactGold } from './api'
import type { Trade, Wallet } from './wallet'
import {toast} from 'sonner'
import {purchaseMessage} from './purchase-message'

const GoldContext = createContext<{ wallet: Wallet; transact: (action: Trade) => Promise<void>; loading: boolean; busy: boolean; error: string; testClaimed: boolean; testEnabled: boolean; refresh: () => Promise<void> } | null>(null)
export function GoldIcon({ className = 'size-6' }: { className?: string }) {
  return <img src="/currency/gold-coin-starfish.png" alt="" aria-hidden="true" className={`${className} shrink-0 object-contain`} />
}
export function GoldProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return <AccountGold key={session?.user.id ?? 'guest'} userId={session?.user.id}>{children}</AccountGold>
}
function AccountGold({ children, userId }: { children: ReactNode; userId?: string }) {
  const [wallet, setWallet] = useState<Wallet>(emptyWallet)
  const [loading, setLoading] = useState(Boolean(userId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [testClaimed, setTestClaimed] = useState(false)
  const [testEnabled, setTestEnabled] = useState(false)
  const active = useRef(true)
  const locked = useRef(false)
  const pending = useRef<{ signature: string; id: string } | null>(null)
  function apply(data: Awaited<ReturnType<typeof loadGold>>) {
    if (!active.current) return
    setWallet({ gold: data.gold, inventory: data.inventory })
    setTestClaimed(data.testClaimed); setTestEnabled(data.testEnabled); setError('')
  }
  async function refresh() {
    if (!userId || locked.current) return
    try { apply(await loadGold()) } catch (cause) { if (active.current) setError(goldError(cause)) }
    finally { if (active.current) setLoading(false) }
  }
  useEffect(() => {
    active.current = true
    void refresh()
    const reload = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', reload); window.addEventListener('online', reload);window.addEventListener('attendance-changed',reload)
    return () => { active.current = false; window.removeEventListener('focus', reload); window.removeEventListener('online', reload);window.removeEventListener('attendance-changed',reload) }
    // AccountGold remounts when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  const sequence = useRef(0)
  const [effects, setEffects] = useState<{ id: number; delta: number }[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  async function transact(action: Trade) {
    if (!userId) throw new Error('로그인이 필요해요.')
    if (locked.current || loading) return
    locked.current = true; setBusy(true)
    const signature = JSON.stringify(action)
    if (pending.current && pending.current.signature !== signature) {
      locked.current = false; setBusy(false)
      throw new Error('이전 거래 결과를 확인하려면 같은 거래를 다시 눌러주세요.')
    }
    pending.current ??= { signature, id: crypto.randomUUID() }
    let result: Awaited<ReturnType<typeof transactGold>>
    try {
      result = await transactGold(action, pending.current.id)
      pending.current = null
      apply(result)
    } catch (cause) {
      // Keep the operation ID on transport failure; retry cannot charge twice.
      if (cause && typeof cause === 'object' && 'code' in cause && /^[0-9A-Z]{5}$/.test(String(cause.code))) pending.current = null
      throw new Error(goldError(cause))
    } finally { locked.current = false; if (active.current) setBusy(false) }
    if (!active.current) return
    const message=purchaseMessage(action)
    if(message)toast.success(message)
    if (result.delta === 0) return
    const id = ++sequence.current
    setEffects(previous => [...previous.slice(-3), { id, delta: result.delta }])
    const timer = setTimeout(() => {
      setEffects(previous => previous.filter(effect => effect.id !== id))
      timers.current = timers.current.filter(value => value !== timer)
    }, 1400)
    timers.current.push(timer)
  }
  return <GoldContext.Provider value={{ wallet, transact, loading, busy, error, testClaimed, testEnabled, refresh }}>
    {children}
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center" aria-live="polite" aria-atomic="true">
      <div className="flex flex-col items-center gap-2">{effects.map(effect => <div key={effect.id} className={`gold-change flex items-center gap-2 py-1 ${effect.delta > 0 ? 'gold-change-gain' : 'gold-change-loss'}`}><span className="gold-change-number text-4xl font-extrabold tracking-tight tabular-nums">{effect.delta > 0 ? '+' : '−'}{Math.abs(effect.delta).toLocaleString('ko-KR')}</span><GoldIcon className="size-10"/><span className="sr-only">골드</span></div>)}</div>
    </div>
  </GoldContext.Provider>
}
export function useGold() {
  const context = useContext(GoldContext)
  if (!context) throw new Error('GoldProvider가 필요해요.')
  return context
}
