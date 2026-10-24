import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { maxDisplayLayer } from './inhabitant-depth'

export function InhabitantLayerEditor({ value, automatic, busy, onChange }: {
  value: number | null; automatic: number; busy: boolean; onChange: (value: number | null) => Promise<void>
}) {
  const depth = value ?? automatic
  const [draft, setDraft] = useState(String(depth))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const locked = useRef(false)
  async function save(next: number | null) {
    if (busy || locked.current || next === value) return
    if (next !== null && (!Number.isInteger(next) || next < 0 || next > maxDisplayLayer)) {
      setError(`0~${maxDisplayLayer} 사이의 정수를 입력해주세요.`)
      return
    }
    locked.current = true; setSaving(true); setError('')
    try { await onChange(next); setDraft(String(next ?? automatic)) }
    catch { setDraft(String(depth)); setError('순서를 저장하지 못했어요. 다시 시도해주세요.') }
    finally { locked.current = false; setSaving(false) }
  }
  function commit() {
    if (!draft.trim()) {setDraft(String(depth)); return}
    void save(Number(draft))
  }
  return <div className="w-full space-y-1">
    <div className="mx-auto flex w-fit max-w-full items-center justify-center gap-1 rounded-xl bg-background/75 px-1" role="group" aria-label="개체 앞뒤 순서">
      <span className="mr-1 text-[11px] text-muted-foreground">앞뒤 순서</span>
      <Button variant="ghost" size="icon" className="min-h-11 shrink-0" aria-label="개체 뒤로" disabled={busy || saving || depth === 0} onClick={() => void save(Math.max(0, depth - 1))}><ArrowDown className="size-4"/></Button>
      <Input type="text" inputMode="numeric" pattern="[0-9]*" className="h-11 w-14 px-1 text-center text-xs tabular-nums" aria-label="개체 표시 우선순위" value={draft} disabled={busy || saving} onFocus={event => event.target.select()} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => {if (event.key === 'Enter') {event.preventDefault(); commit()}}}/>
      <Button variant="ghost" size="icon" className="min-h-11 shrink-0" aria-label="개체 앞으로" disabled={busy || saving || depth === maxDisplayLayer} onClick={() => void save(Math.min(maxDisplayLayer, depth + 1))}><ArrowUp className="size-4"/></Button>
      <Button variant="ghost" className="min-h-11 gap-1 px-1 text-[11px]" aria-label="개체 앞뒤 순서 자동" aria-pressed={value === null} disabled={busy || saving || value === null} onClick={() => void save(null)}><RotateCcw className="size-3.5"/>자동</Button>
    </div>
    <p className="mx-auto w-fit rounded-md bg-background/75 px-2 py-0.5 text-center text-[10px] text-muted-foreground">숫자가 클수록 앞에 보여요.{value === null ? ' · 자동' : ''}</p>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>
}
