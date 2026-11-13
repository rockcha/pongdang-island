import { useState } from 'react'
import { useAccountResource } from '@/lib/account-query'
import { Button } from '@/components/ui/button'
import { readTowerRanking } from './tower-defense-api'
import { WeeklyRewards } from './weekly-rewards'
import { RankingRow, rankingListClass } from './ranking-row'
import { RankingFriendAction } from './ranking-friend-action'
export function TowerDefenseRanking() {
  const [offset, setOffset] = useState(0)
  const query = useAccountResource(['tower-defense-ranking', offset], (signal) =>
    readTowerRanking(signal, offset),
  )
  return (
    <section className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h3>이번 주 최고 스테이지</h3>
        <Button variant="ghost" disabled={query.isFetching} onClick={() => void query.refetch()}>
          새로고침
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        통과 스테이지가 높은 순 · 같은 기록이면 먼저 달성한 순이에요. 실전 종료 기록만 집계하며
        연습·중도 종료는 제외돼요.
      </p>
      <WeeklyRewards rewards={query.data?.rewards} weekEnd={query.data?.weekEnd} />
      {query.isLoading && <p role="status">랭킹을 불러오는 중…</p>}
      {query.error && <p role="alert">랭킹을 불러오지 못했어요. 새로고침해 주세요.</p>}
      <ol className={rankingListClass}>
        {query.data?.rows.map((row) => (
          <RankingRow
            key={row.id}
            {...row}
            action={<RankingFriendAction player={row} />}
            record={
              <span className="text-right">
                <span>{row.score}스테이지</span>
                <small className="block text-[10px] text-muted-foreground">
                  {new Date(row.finishedAt).toLocaleString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              </span>
            }
          />
        ))}
      </ol>
      {query.data?.total === 0 && (
        <p className="py-6 text-center text-sm">이번 주 첫 기록에 도전해 보세요.</p>
      )}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          disabled={!offset}
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
