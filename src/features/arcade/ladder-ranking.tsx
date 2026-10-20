import { useEffect, useState, useRef } from 'react'
import { GoldIcon } from '@/features/gold/gold-provider'
import { Button } from '@/components/ui/button'
import { loadLadderRanks, type LadderRanks } from './ladder-api'
import { RankingRow, rankingListClass } from './ranking-row'
export function LadderRanking() {
  const [data, setData] = useState<LadderRanks | null>(null)
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const alive = useRef(true),
    lock = useRef(false)
  async function load(offset = 0) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const next = await loadLadderRanks(offset)
      if (alive.current) {
        setData((old) => ({
          ...next,
          rows: offset && old ? [...old.rows, ...next.rows] : next.rows,
        }))
        setError('')
      }
    } catch {
      if (alive.current) setError('순위를 불러오지 못했어요. 다시 확인해주세요.')
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  useEffect(() => {
    alive.current = true
    void load()
    return () => {
      alive.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      role="tabpanel"
      id="ladder-rank-panel"
      aria-labelledby="ladder-rank-tab"
      className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
    >
      <h3 className="text-sm">사다리 최고 지급 기록</h3>
      <p className="text-xs text-muted-foreground">실전 한 판의 최고 지급액 · 원금 포함</p>
      <ol className={rankingListClass}>
        {data?.rows.map((row) => (
          <RankingRow
            key={row.id}
            rank={row.rank}
            nickname={row.nickname}
            mine={row.mine}
            record={
              <span className="flex items-center gap-1">
                <GoldIcon className="size-4" />
                {row.gold.toLocaleString()}
              </span>
            }
          />
        ))}
      </ol>
      {data && !data.total && (
        <p className="py-8 text-center text-xs text-muted-foreground">
          첫 행운의 주인공을 기다리고 있어요.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="text-xs">
          기록을 불러오는 중…
        </p>
      )}
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => void load(data && data.rows.length < data.total ? data.rows.length : 0)}
      >
        {data && data.rows.length < data.total ? '더 보기' : '새로고침'}
      </Button>
    </div>
  )
}
