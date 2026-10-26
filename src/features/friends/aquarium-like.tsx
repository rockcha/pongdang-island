import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import { useAccountState } from '@/lib/account-query'
import { likeAquarium, readAquariumLike } from './aquarium-likes-api'
import { Button } from '@/components/ui/button'
export function AquariumLike({ owner }: { owner: string }) {
  return <DailyAquariumLike key={owner} owner={owner} />
}
function DailyAquariumLike({ owner }: { owner: string }) {
  const read = useCallback((signal: AbortSignal) => readAquariumLike(owner, signal), [owner])
  const [value, setValue, query] = useAccountState(['aquarium-likes', owner], read)
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const lock = useRef(false),
    active = useRef(true)
  const refetch = query.refetch
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    if (!value?.nextLikeAt || !value.serverNow) return
    const delay =
      Date.parse(value.nextLikeAt) -
      Date.parse(value.serverNow) -
      Math.max(0, Date.now() - query.dataUpdatedAt)
    if (!Number.isFinite(delay)) return
    const timer = setTimeout(
      () => void refetch({ cancelRefetch: false }),
      Math.max(100, delay + 100),
    )
    return () => clearTimeout(timer)
  }, [value?.nextLikeAt, value?.serverNow, query.dataUpdatedAt, refetch])
  async function act() {
    if (!value || value.liked || lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const next = await likeAquarium(owner)
      if (active.current) setValue(next)
    } catch {
      if (active.current) setError('좋아요를 저장하지 못했어요. 다시 눌러 주세요.')
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  const message = error || (query.error ? '좋아요를 불러오지 못했어요.' : '')
  return (
    <div className="ml-auto flex items-center">
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11 gap-1.5 rounded-full px-2 text-xs disabled:opacity-100"
        disabled={busy || !!value?.liked || (!value && !message)}
        aria-label={message && !value ? '좋아요 다시 불러오기' : '아쿠아리움 좋아요'}
        aria-description="친구마다 하루 한 번, 한국 시간 자정에 다시 누를 수 있어요."
        aria-pressed={value?.liked ?? false}
        title={value?.liked ? '오늘 좋아요 완료 · 내일 또 응원해 주세요' : '하루 한 번 좋아요'}
        onClick={() => (value ? void act() : void refetch())}
      >
        <Heart
          aria-hidden="true"
          className={`size-4 ${value?.liked ? 'fill-rose-400 text-rose-500' : ''}`}
        />
        {value?.count ?? '…'}
      </Button>
      {message && (
        <span role="alert" className="max-w-28 text-[10px] text-destructive">
          {message}
        </span>
      )}
    </div>
  )
}
