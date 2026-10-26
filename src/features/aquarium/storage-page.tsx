import {useAccountState} from '@/lib/account-query'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useGold } from '@/features/gold/gold-provider'
import { CollectibleStorageDialog } from './collectible-storage-dialog'
import { readAquarium, type AquariumState } from './api'

export function StoragePage() {
  const gold = useGold()
  const [state,,query]=useAccountState<AquariumState>('aquarium',readAquarium)
  const [error, setError] = useState('')
  const alive = useRef(true)
  async function reload() {
    try {
      await query.refetch({throwOnError:true,cancelRefetch:false})
      if(alive.current)setError('')
    } catch { if (alive.current) setError('보관함 정보를 불러오지 못했어요. 다시 시도해주세요.') }
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(()=>{setError(query.error?'보관함 정보를 불러오지 못했어요. 다시 시도해주세요.':'')},[query.error])
  function changed(_ids: string[]) {
    window.dispatchEvent(new Event('collectibles-changed'))
    void reload()
  }
  return <section aria-label="보관함" className="flex min-h-0 flex-1 flex-col overflow-hidden">
    {error && <div role="alert" className="flex items-center justify-between gap-2 px-4 py-3 text-xs"><p>{error}</p><Button variant="outline" size="sm" onClick={() => void reload()}>다시 불러오기</Button></div>}
    {!state && !error && <p role="status" className="py-12 text-center text-xs text-muted-foreground">보관함을 불러오는 중…</p>}
    {state && <>
      <CollectibleStorageDialog page state={state} currentTankId="" busy={gold.busy || gold.loading}
        onSell={async ids => { await gold.transact({ type: 'sell', id: `collectibles:${[...ids].sort().join(',')}` }); changed(ids) }}
        onGiftSent={changed}
      />
    </>}
  </section>
}
