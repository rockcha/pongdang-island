import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { GoldIcon } from '@/features/gold/gold-provider'
import { randomId } from '@/lib/random-id'
import {
  definitiveIslandError,
  islandError,
  type IslandSnapshot,
  type IslandTradeArgs,
  type tradeIsland,
} from './api'
import { FarmOfficeArt } from './farm-office-art'

const limits = [4, 9, 16, 25, 36, 49]
function restore(key: string): IslandTradeArgs | null {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? 'null')
    return p?.action === 'buy' &&
      p.itemId === 'farm-office' &&
      p.quantity === 1 &&
      [5000, 10000, 15000, 20000, 25000].includes(p.price) &&
      typeof p.operationId === 'string' &&
      /^[a-f0-9-]{36}$/i.test(p.operationId)
      ? p
      : null
  } catch {
    return null
  }
}
type Props = {
  snapshot: IslandSnapshot
  gold: number
  walletLoading: boolean
  walletError: string
  storageKey: string
  usedPlots: number
  open: boolean
  onOpenChange: (value: boolean) => void
  trade: typeof tradeIsland
  beforePurchase: () => Promise<unknown>
  reload: () => Promise<unknown>
  onPlace: (id: string) => void
}
export function FarmOffice({
  snapshot,
  gold,
  walletLoading,
  walletError,
  storageKey,
  usedPlots,
  open,
  onOpenChange,
  trade,
  beforePurchase,
  reload,
  onPlace,
}: Props) {
  const key = storageKey + ':office-purchase'
  const [pending, setPending] = useState<IslandTradeArgs | null>(() => restore(key)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [flash, setFlash] = useState(false)
  const lock = useRef(false),
    active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 900)
    return () => clearTimeout(t)
  }, [flash])
  const level = snapshot.farm?.officeLevel ?? 0,
    limit = snapshot.farm?.plotLimit ?? 4,
    nextCost = snapshot.farm?.nextCost ?? (level < 5 ? (level + 1) * 5000 : null)
  const office = snapshot.items.find((i) => i.type === 'farm-office'),
    placed = !!office && snapshot.document.layout.some((p) => p.id === office.id)
  function remember(value: IslandTradeArgs | null) {
    setPending(value)
    try {
      if (value) localStorage.setItem(key, JSON.stringify(value))
      else localStorage.removeItem(key)
    } catch {
      /* Keep the same request in memory. */
    }
  }
  async function confirm() {
    if (lock.current || (!pending && nextCost === null)) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (!pending) await beforePurchase()
      if (!active.current) return
      const args = pending ?? {
        action: 'buy' as const,
        itemId: 'farm-office',
        quantity: 1,
        price: nextCost!,
        operationId: randomId(),
      }
      remember(args)
      await trade(args, () => active.current)
      if (active.current) {
        remember(null)
        setFlash(true)
      }
    } catch (cause) {
      if (!active.current) return
      if (definitiveIslandError(cause)) {
        remember(null)
        try {
          await reload()
        } catch {
          /* Keep the command error and allow a later refresh. */
        }
      }
      if (active.current) setError(islandError(cause))
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  return (
    <>
      <button
        className="farm-office-launcher"
        onClick={() => onOpenChange(true)}
        aria-label="텃밭 관리소 열기"
      >
        <svg viewBox="0 -4 64 68" aria-hidden="true">
          <FarmOfficeArt level={Math.max(1, level)} />
        </svg>
        <span>
          <strong>
            텃밭 관리소 <small>{level ? `Lv.${level}` : '미건설'}</small>
          </strong>
          <span>
            밭 {usedPlots} / {limit}칸{pending ? ' · 결과 확인' : ''}
          </span>
        </span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) onOpenChange(value)
        }}
      >
        <DialogContent className="farm-office-dialog" showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>
              텃밭 관리소{level > 0 && <span className="farm-office-level">Lv.{level}</span>}
            </DialogTitle>
            <DialogDescription className="sr-only">
              관리소를 강화하면 배치할 수 있는 밭이 늘어나요.
            </DialogDescription>
          </DialogHeader>
          <div className={`farm-office-portrait ${flash ? 'is-upgraded' : ''}`} key={level}>
            <svg viewBox="-5 -5 74 74" aria-label={`텃밭 관리소 ${level || 1}레벨 외형`} role="img">
              <FarmOfficeArt level={Math.max(1, level)} />
            </svg>
          </div>
          <p className="farm-office-current">
            관리 중인 밭{' '}
            <strong>
              {usedPlots} / {limit}칸
            </strong>
          </p>
          {level < 5 ? (
            <div className="farm-office-next">
              <span>{level ? '강화 후' : '건설 후'}</span>
              <strong>최대 {limits[level + 1]}칸</strong>
              <span>Lv.{level + 1}</span>
            </div>
          ) : (
            <p className="farm-office-max">최고 레벨이에요</p>
          )}
          {error && (
            <p role="alert" className="text-center text-xs leading-5 text-destructive">
              {error}
            </p>
          )}
          {walletError && (
            <p role="alert" className="text-center text-xs text-destructive">
              골드 정보를 다시 확인해 주세요.
            </p>
          )}
          {(level < 5 || pending) && (
            <Button
              className="w-full"
              disabled={
                busy || walletLoading || !!walletError || (!pending && gold < (nextCost ?? 0))
              }
              onClick={() => void confirm()}
            >
              {busy ? (
                '확인 중…'
              ) : pending ? (
                '결과 다시 확인'
              ) : (
                <>
                  <GoldIcon className="size-4" />
                  {nextCost?.toLocaleString('ko-KR')} · {level ? '강화하기' : '건설하기'}
                </>
              )}
            </Button>
          )}
          {office && !placed && (
            <Button
              variant="outline"
              disabled={busy || !!pending}
              onClick={() => {
                onOpenChange(false)
                onPlace(office.id)
              }}
            >
              농장에 배치하기
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
