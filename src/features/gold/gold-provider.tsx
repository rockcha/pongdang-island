import { randomId } from '@/lib/random-id'
import {createPortal} from 'react-dom'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider'
import { emptyWallet } from './wallet'
import { goldError, readGold, transactGold } from './api'
import { useAccountResource } from '@/lib/account-query'
import { accountQueryKey, appQueryClient, getQueryAccount, publishAccountResource } from '@/lib/account-cache'
import type { Trade, Wallet } from './wallet'
import {playPurchaseSound,playSaleSound,playRewardSound} from './purchase-sound'
import {GoldChange} from './gold-change'
import {BAIT_RECEIVED,type BaitRewardEffect} from '@/features/fishing/bait-reward-effect'

const GoldContext = createContext<{ wallet: Wallet; transact: (action: Trade) => Promise<void>; batchEffects: (work: () => Promise<void>) => Promise<void>; loading: boolean; busy: boolean; error: string; testClaimed: boolean; testEnabled: boolean; refresh: () => Promise<void> } | null>(null)
export function GoldIcon({ className = 'size-6' }: { className?: string }) {
  return <img src="/currency/gold-coin-starfish.png" alt="" aria-hidden="true" className={`${className} shrink-0 object-contain`} />
}
export function GoldProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return <AccountGold key={session?.user.id ?? 'guest'} userId={session?.user.id}>{children}</AccountGold>
}
function AccountGold({ children, userId }: { children: ReactNode; userId?: string }) {
  const query = useAccountResource('wallet', readGold)
  const wallet: Wallet = query.data ?? emptyWallet()
  const loading = Boolean(userId) && query.isPending
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const testClaimed = query.data?.testClaimed ?? false
  const testEnabled = query.data?.testEnabled ?? false
  const active = useRef(true)
  const mountedAt=useRef(performance.now()),receivedBaits=useRef(new Set<string>())
  const locked = useRef(false)
  const pending = useRef<{ signature: string; id: string } | null>(null)
  const previousGold=useRef<number|null>(null),previousFuel=useRef<number|null>(null)
  const handledGold=useRef<number|null>(null)
  function apply(data: Awaited<ReturnType<typeof readGold>>,notifyChange=false) {
    if (!active.current) return
    if(notifyChange&&previousGold.current!==null){
      const handled=handledGold.current===data.gold
      handledGold.current=null
      if(!handled)showDelta(data.gold-previousGold.current)
    }
    const fuel=data.inventory.fuel??0
    if(previousFuel.current!==null)showDelta(fuel-previousFuel.current,'fuel')
    if(notifyChange&&previousFuel.current!==null&&fuel>previousFuel.current)playRewardSound(`fuel:${randomId()}`)
    previousFuel.current=fuel
    previousGold.current=data.gold
    setError('')
  }
  async function refresh() {
    if (!userId || locked.current) return
    const result = await query.refetch({ cancelRefetch: false })
    if (result.error && active.current) setError(goldError(result.error))
  }
  useEffect(() => {
    if (query.data && !locked.current) apply(query.data, true)
  }, [query.data])
  useEffect(() => {
    active.current = true
    const receiveBait=(event:Event)=>{
      const reward=(event as CustomEvent<BaitRewardEffect>).detail
      if(!userId||!reward||reward.startedAt<mountedAt.current||!Number.isSafeInteger(reward.quantity)||reward.quantity<=0||receivedBaits.current.has(reward.key))return
      receivedBaits.current.add(reward.key)
      if(receivedBaits.current.size>500)receivedBaits.current.delete(receivedBaits.current.values().next().value!)
      showDelta(reward.quantity,'bait',reward.icon,reward.name)
      playRewardSound(reward.key)
    }
    const islandGold=(event:Event)=>{const detail=(event as CustomEvent<{owner:string;gold:number}>).detail;if(detail?.owner===userId&&Number.isSafeInteger(detail.gold)&&detail.gold!==previousGold.current)handledGold.current=detail.gold}
    window.addEventListener('pongdang-island-gold-effect',islandGold)
    window.addEventListener(BAIT_RECEIVED,receiveBait)
    return () => { active.current = false; window.removeEventListener(BAIT_RECEIVED,receiveBait);window.removeEventListener('pongdang-island-gold-effect',islandGold) }
    // AccountGold remounts when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  const [groupBusy,setGroupBusy]=useState(false)
  const effectBatch=useRef<{delta:number;purchaseKey:string;saleKey:string}|null>(null)
  const sequence = useRef(0)
  const [effects, setEffects] = useState<{ id: number; delta: number; resource:'gold'|'fuel'|'bait';icon?:string;name?:string }[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  async function transact(action: Trade) {
    if (!userId) throw new Error('로그인이 필요해요.')
    if (locked.current || loading) return
    const scope = getQueryAccount()
    void appQueryClient.cancelQueries({ queryKey: accountQueryKey(userId, 'wallet') })
    locked.current = true; setBusy(true)
    const signature = JSON.stringify(action)
    if (pending.current && pending.current.signature !== signature) {
      locked.current = false; setBusy(false)
      throw new Error('이전 거래 결과를 확인하려면 같은 거래를 다시 눌러주세요.')
    }
    let result: Awaited<ReturnType<typeof transactGold>>
    let purchaseKey=''
    let saleKey=''
    try {
      pending.current ??= { signature, id: randomId() }
      result = await transactGold(action, pending.current.id)
      if(action.type==='buy')purchaseKey=pending.current.id
      if(action.type==='sell')saleKey=pending.current.id
      pending.current = null
      apply(result)
      if(active.current)publishAccountResource('wallet', result, scope, userId)
    } catch (cause) {
      // Keep the operation ID on transport failure; retry cannot charge twice.
      if (cause && typeof cause === 'object' && 'code' in cause && /^[0-9A-Z]{5}$/.test(String(cause.code))) pending.current = null
      throw new Error(goldError(cause))
    } finally { locked.current = false; if (active.current) setBusy(false) }
    if (!active.current) return
    if(purchaseKey){if(effectBatch.current)effectBatch.current.purchaseKey=purchaseKey;else playPurchaseSound(purchaseKey)}
    if(saleKey){if(effectBatch.current)effectBatch.current.saleKey=saleKey;else playSaleSound(saleKey)}
    if(effectBatch.current){effectBatch.current.delta+=result.delta;return}
    showDelta(result.delta)
  }
  function showDelta(delta:number,resource:'gold'|'fuel'|'bait'='gold',icon?:string,name?:string){
    if(delta===0)return
    const id = ++sequence.current
    setEffects(previous => [...previous.slice(-3), { id, delta, resource,icon,name }])
    const timer = setTimeout(() => {
      setEffects(previous => previous.filter(effect => effect.id !== id))
      timers.current = timers.current.filter(value => value !== timer)
    }, 1400)
    timers.current.push(timer)
  }
  async function batchEffects(work:()=>Promise<void>){
    if(effectBatch.current||locked.current||loading)throw new Error('다른 구매를 마친 뒤 다시 시도해주세요.')
    const batch={delta:0,purchaseKey:'',saleKey:''};effectBatch.current=batch;setGroupBusy(true)
    try{await work()}finally{effectBatch.current=null;if(active.current){setGroupBusy(false);if(batch.purchaseKey)playPurchaseSound(batch.purchaseKey);if(batch.saleKey)playSaleSound(batch.saleKey);showDelta(batch.delta)}}
  }
  return <GoldContext.Provider value={{ wallet, transact, batchEffects, loading, busy:busy||groupBusy, error: error || (query.error ? goldError(query.error) : ''), testClaimed, testEnabled, refresh }}>
    {children}
    {createPortal(<div data-gold-effects className="pointer-events-none fixed inset-0 z-[2147483000] flex items-center justify-center" aria-live="polite" aria-atomic="true">
      <div className="flex flex-col items-center gap-2">{effects.map(effect => <GoldChange key={effect.id} delta={effect.delta} resource={effect.resource} icon={effect.icon} name={effect.name} />)}</div>
    </div>,document.body)}
  </GoldContext.Provider>
}
export function useGold() {
  const context = useContext(GoldContext)
  if (!context) throw new Error('GoldProvider가 필요해요.')
  return context
}
