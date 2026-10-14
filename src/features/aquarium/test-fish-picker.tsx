import { useEffect, useState } from 'react'
import { loadCollection } from '@/features/collection/api'
import type { CollectionState, OwnedCollectible, Species } from '@/features/collection/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function TestFishPicker({ tankId, count, onAdd, onClear }: {
  tankId: string; count: number; onAdd: (item: OwnedCollectible) => void; onClear: () => void
}) {
  const [fish, setFish] = useState<Species[]>([])
  const [selected, setSelected] = useState('')
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setError(false)
    void loadCollection().then((data: CollectionState) => {
      if (!active) return
      const species = data.catalog.filter(item => item.kind === 'fish')
      setFish(species)
      setSelected(species[0]?.id ?? '')
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [retry])
  function add() {
    const species = fish.find(item => item.id === selected)
    if (!species) return
    onAdd({ id: `test-${crypto.randomUUID()}`, species_id: species.id, tank_id: tankId,
      animation_seed: Math.floor(Math.random() * 1000000), position_x: null, position_y: null,
      acquired_at: new Date().toISOString(), species })
  }
  return <div className="space-y-2 rounded-xl border p-3">
    <Label htmlFor="test-fish-species">테스트 어종</Label>
    <div className="flex flex-wrap gap-2">
      <select id="test-fish-species" value={selected} onChange={event => setSelected(event.target.value)}
        disabled={!fish.length} className="min-h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm">
        {!fish.length && <option value="">{error ? '어종을 불러오지 못했어요' : '어종 불러오는 중…'}</option>}
        {fish.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <Button disabled={!selected} onClick={add}>넣기</Button>
      <Button variant="outline" disabled={!count} onClick={onClear}>테스트 개체 비우기</Button>
    </div>
    {error && <Button variant="outline" onClick={() => setRetry(value => value + 1)}>어종 다시 불러오기</Button>}
    <p className="text-xs text-muted-foreground">이 어항에 테스트 개체 {count}마리 · 새로고침하면 사라지며 보유 목록에는 저장되지 않아요.</p>
  </div>
}
