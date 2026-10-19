import { randomId } from '@/lib/random-id'
import {createPortal} from 'react-dom'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider'
import { emptyWallet } from './wallet'
import { goldError, loadGold, transactGold } from './api'
import type { Trade, Wallet } from './wallet'
import {toast} from 'sonner'
import {purchaseMessage} from './purchase-message'

const GoldContext = createContext<{ wallet: Wallet; transact: (action: Trade) => Promise<void>; batchEffects: (work: () => Promise<void>) => Promise<void>; loading: boolean; busy: boolean; error: string; testClaimed: boolean; testEnabled: boolean; refresh: () => Promise<void> } | null>(null)
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
  const previousGold=useRef<number|null>(null),revision=useRef(0),refreshRequest=useRef(0)
  function apply(data: Awaited<ReturnType<typeof loadGold>>,notifyGain=false) {
    if (!active.current) return
    if(notifyGain&&previousGold.current!==null&&data.gold>previousGold.current)showDelta(data.gold-previousGold.current)
    previousGold.current=data.gold;revision.current++
    setWallet({ gold: data.gold, inventory: data.inventory })
    setTestClaimed(data.testClaimed); setTestEnabled(data.testEnabled); setError('')
  }
  async function refresh() {
    if (!userId || locked.current) return
    const version=revision.current,request=++refreshRequest.current
    try {const data=await loadGold();if(!locked.current&&version===revision.current&&request===refreshRequest.current)apply(data,true)} catch (cause) { if (active.current) setError(goldError(cause)) }
    finally { if (active.current) setLoading(false) }
  }
  useEffect(() => {
    active.current = true
    void refresh()
    const reload = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', reload); window.addEventListener('online', reload);window.addEventListener('attendance-changed',reload)
    window.addEventListener('wallet-changed',reload)
    return () => { active.current = false; window.removeEventListener('focus', reload); window.removeEventListener('online', reload);window.removeEventListener('attendance-changed',reload);window.removeEventListener('wallet-changed',reload) }
    // AccountGold remounts when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  const [groupBusy,setGroupBusy]=useState(false)
  const effectBatch=useRef<{delta:number;message:string;purchases:number;purchaseName:string}|null>(null)
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
    let result: Awaited<ReturnType<typeof transactGold>>
    try {
      pending.current ??= { signature, id: randomId() }
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
    if(effectBatch.current){effectBatch.current.delta+=result.delta;if(message)effectBatch.current.message=message;if(action.type==='buy'&&action.id.startsWith('fishing:')){effectBatch.current.purchases++;effectBatch.current.purchaseName=action.name||'미끼'}return}
    if(message)toast.success(message)
    showDelta(result.delta)
  }
  function showDelta(delta:number){
    if(delta===0)return
    const id = ++sequence.current
    setEffects(previous => [...previous.slice(-3), { id, delta }])
    const timer = setTimeout(() => {
      setEffects(previous => previous.filter(effect => effect.id !== id))
      timers.current = timers.current.filter(value => value !== timer)
    }, 1400)
    timers.current.push(timer)
  }
  async function batchEffects(work:()=>Promise<void>){
    if(effectBatch.current||locked.current||loading)throw new Error('다른 구매를 마친 뒤 다시 시도해주세요.')
    const batch={delta:0,message:'',purchases:0,purchaseName:''};effectBatch.current=batch;setGroupBusy(true)
    try{await work()}finally{effectBatch.current=null;if(active.current){setGroupBusy(false);if(batch.message)toast.success(batch.purchases?`${batch.purchaseName} ${batch.purchases}마리 구매했습니다.`:batch.message);showDelta(batch.delta)}}
  }
  return <GoldContext.Provider value={{ wallet, transact, batchEffects, loading, busy:busy||groupBusy, error, testClaimed, testEnabled, refresh }}>
    {children}
    {createPortal(<div data-gold-effects className="pointer-events-none fixed inset-0 z-[2147483000] flex items-center justify-center" aria-live="polite" aria-atomic="true">
      <div className="flex flex-col items-center gap-2">{effects.map(effect => <div key={effect.id} className={`gold-change flex items-center gap-2 py-1 ${effect.delta > 0 ? 'gold-change-gain' : 'gold-change-loss'}`}><span className="gold-change-number">{effect.delta > 0 ? '+' : '−'}{Math.abs(effect.delta).toLocaleString('ko-KR')}</span><GoldIcon className="gold-change-coin"/>{effect.delta>0&&<span aria-hidden="true"><i className="gold-change-sparkle"/><i className="gold-change-sparkle"/><i className="gold-change-sparkle"/></span>}<span className="sr-only">골드</span></div>)}</div>
    </div>,document.body)}
  </GoldContext.Provider>
}
export function useGold() {
  const context = useContext(GoldContext)
  if (!context) throw new Error('GoldProvider가 필요해요.')
  return context
}
