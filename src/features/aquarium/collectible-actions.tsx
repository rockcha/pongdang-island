import { useRef, useState } from 'react'
import { Archive, ArrowRightLeft } from 'lucide-react'
import { GoldIcon } from '@/features/gold/gold-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CollectibleSaleDialog } from './collectible-sale-dialog'
import { storageError } from './api'
import type { AquariumTank } from './api'
import type { OwnedCollectible } from '@/features/collection/api'

export function CollectibleActions({ item, tanks = [], inhabitants = [], capacity = 50, busy, onMove, onStore, onSell, onDone }: {
  item: OwnedCollectible; tanks?: AquariumTank[]; inhabitants?: OwnedCollectible[]; capacity?: number; busy: boolean
  onMove?: (ids: string[], tank: string | null) => Promise<void>; onStore?: (ids: string[]) => Promise<void>
  onSell: (ids: string[]) => Promise<void>; onDone: () => void
}) {
  const [mode, setMode] = useState<'move' | 'sell' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const disabled = busy || saving || item.id.startsWith('test-') || item.species.kind === 'map'
  async function run(action: () => Promise<void>, selling = false) {
    if (disabled || lock.current) return
    lock.current = true; setSaving(true); setError('')
    try { await action(); setMode(null); onDone() }
    catch (cause) { setError(selling ? '판매하지 못했어요. 잠시 후 다시 시도해주세요.' : storageError(cause)) }
    finally { lock.current = false; setSaving(false) }
  }
  return <>
    <div className="grid w-full grid-cols-3 gap-1.5 border-t pt-2">
      <Button variant="secondary" className="min-h-11 gap-1 px-2 text-xs" disabled={disabled || !onMove} onClick={() => {setError(''); setMode('move')}}><ArrowRightLeft className="size-4"/>이동</Button>
      <Button variant="secondary" className="min-h-11 gap-1 px-2 text-xs" disabled={disabled || !onStore} onClick={() => void run(() => onStore!([item.id]))}><Archive className="size-4"/>보관함</Button>
      <Button variant="outline" className="min-h-11 min-w-0 gap-1 px-1 text-xs" aria-label={`판매 ${item.species.sell_price.toLocaleString('ko-KR')} 골드`} disabled={disabled || item.species.sell_price <= 0} onClick={() => {setError(''); setMode('sell')}}><span>판매</span><GoldIcon className="size-4"/><span className="tabular-nums">{item.species.sell_price.toLocaleString('ko-KR')}</span></Button>
    </div>
    {error && mode === null && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <Dialog open={mode === 'move'} onOpenChange={open => {if (!open && !saving) setMode(null)}}>
      <DialogContent className="flex max-h-[80dvh] flex-col sm:max-w-sm" showCloseButton={!saving}>
        <DialogHeader><DialogTitle>다른 어항으로 이동</DialogTitle><DialogDescription>{item.species.name}를 옮길 어항을 골라주세요.</DialogDescription></DialogHeader>
        <div className="min-h-0 space-y-2 overflow-y-auto">{tanks.filter(tank => tank.id !== item.tank_id).map(tank => {
          const count = inhabitants.filter(other => other.tank_id === tank.id).length
          return <Button key={tank.id} variant="secondary" className="min-h-12 w-full justify-between" disabled={disabled || count >= capacity} onClick={() => void run(() => onMove!([item.id], tank.id))}><span className="truncate">{tank.name}</span><span className="ml-2 shrink-0 text-xs">{count}/{capacity}{count >= capacity ? ' · 가득 참' : ''}</span></Button>
        })}{tanks.filter(tank => tank.id !== item.tank_id).length === 0 && <p className="py-4 text-sm text-muted-foreground">이동할 다른 어항이 없어요. 보관함으로 옮길 수 있어요.</p>}</div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
    <CollectibleSaleDialog open={mode === 'sell'} onOpenChange={open => {if (!open && !saving) setMode(null)}} items={[item]} busy={saving} disabled={disabled} error={error} onConfirm={() => void run(() => onSell([item.id]), true)}/>
  </>
}
