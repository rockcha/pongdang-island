import { useState } from 'react'
import { useAccountResource } from '@/lib/account-query'
import { Button } from '@/components/ui/button'
import { readOrderRanking } from './aquarium-order-api'
import { WeeklyRewards } from './weekly-rewards'
import { RankingRow, rankingListClass } from './ranking-row'
import { RankingFriendAction } from './ranking-friend-action'
export function AquariumOrderRanking() {
  const [offset, setOffset] = useState(0)
  const query = useAccountResource(['aquarium-order-ranking', offset], (signal) =>
    readOrderRanking(signal, offset),
  )
  return (
    <section
      role="tabpanel"
      id="counting-rank-panel"
      aria-labelledby="counting-rank-tab"
      className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
    >
      <div className="flex items-center justify-between">
        <h3>이번 주 최고 기록</h3>
        <Button variant="ghost" disabled={query.isFetching} onClick={() => void query.refetch()}>
          새로고침
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        높은 점수 → 먼저 완료한 기록 순서예요. 참가비와 즉시 보상은 없어요.
      </p>
      <WeeklyRewards rewards={query.data?.rewards} weekEnd={query.data?.weekEnd} />
      {query.isLoading && <p role="status">랭킹을 불러오는 중…</p>}
      {query.error && <p role="alert">랭킹을 불러오지 못했어요. 새로고침해주세요.</p>}
      <ol className={rankingListClass}>
        {query.data?.rows.map((row) => (
          <RankingRow
            key={row.id}
            {...row}
            action={<RankingFriendAction player={row} />}
            record={<span>{row.score}점</span>}
          />
        ))}
      </ol>
      {query.data?.total === 0 && (
        <p className="py-6 text-center text-sm">이번 주 첫 기록에 도전해보세요.</p>
      )}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          이전
        </Button>
        <Button
          variant="ghost"
          disabled={!query.data || offset + 20 >= query.data.total}
          onClick={() => setOffset(offset + 20)}
        >
          다음
        </Button>
      </div>
    </section>
  )
}
