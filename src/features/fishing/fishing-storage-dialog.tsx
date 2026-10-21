import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { appArt } from '@/components/app-art'
import { Button } from '@/components/ui/button'
import { fishingDockButton } from '@/components/fishing-dock-style'
import { CollectibleStorageDialog } from '@/features/aquarium/collectible-storage-dialog'
import { loadAquarium, moveCollectibles, type AquariumState } from '@/features/aquarium/api'
import type { OwnedCollectible } from '@/features/collection/api'
import { useGold } from '@/features/gold/gold-provider'
import { loadTripStorage } from './fishing-trip-storage'
import type { FishingAttempt } from './api'

export function FishingStorageDialog({ catches, disabled, onSold }: {
  catches: FishingAttempt[]
  disabled: boolean
  onSold: (ids: string[]) => void
}) {
  const gold = useGold()
  const [state, setState] = useState<AquariumState | null>(null)
  const [recent, setRecent] = useState<OwnedCollectible[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const alive = useRef(true)
  const lock = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function show() {
    if (lock.current || disabled) return
    lock.current = true
    setLoading(true)
    try {
      const [aquarium, items] = await Promise.all([loadAquarium(), loadTripStorage(catches, () => alive.current, false)])
      if (alive.current) { setState(aquarium); setRecent(items); setOpen(true) }
    } catch { if (alive.current) toast.error('보관함을 불러오지 못했어요. 다시 눌러주세요.') }
    finally { lock.current = false; if (alive.current) setLoading(false) }
  }
  function removed(ids: string[], tankId?: string) {
    const removedIds = new Set(ids)
    setRecent(items => items.filter(item => !removedIds.has(item.id)))
    setState(previous => previous ? {
      ...previous, storageCount: Math.max(0, previous.storageCount - ids.length),
      inhabitants: tankId ? [...previous.inhabitants, ...recent.filter(item => removedIds.has(item.id)).map(item => ({ ...item, tank_id: tankId }))] : previous.inhabitants,
    } : previous)
    onSold(ids)
    window.dispatchEvent(new Event('collectibles-changed'))
    void loadAquarium().then(data => { if (alive.current) setState(data) }).catch(() => {})
  }
  return <>
    <Button variant="ghost" className={fishingDockButton} aria-label="보관함" disabled={disabled || loading} onClick={() => void show()}>
      <appArt.storage className="size-6" />
      <span className="text-[11px]">{loading ? '불러오는 중…' : '보관함'}</span>
    </Button>
    {state && <CollectibleStorageDialog
      state={state}
      currentTankId={state.tanks[0]?.id ?? ''}
      busy={disabled || gold.busy || gold.loading}
      open={open}
      onOpenChange={setOpen}
      hideTrigger
      recentItems={recent}
      onAssign={async (ids, tankId) => { await moveCollectibles(ids, tankId); removed(ids, tankId) }}
      onSell={async ids => { await gold.transact({ type: 'sell', id: `collectibles:${[...ids].sort().join(',')}` }); removed(ids) }}
      onGiftSent={ids => removed(ids)}
    />}
  </>
}
