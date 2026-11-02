import {useState} from 'react'
import {RotateCcw} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {useAccountResource} from '@/lib/account-query'
import {RankingRow,rankingListClass} from '@/features/arcade/ranking-row'
import {RankingFriendAction} from '@/features/arcade/ranking-friend-action'
import {readExplorationRanking} from './ranking-api'
export function ExplorationRanking(){
 const [offset,setOffset]=useState(0)
 const query=useAccountResource(['exploration-ranking',offset],signal=>readExplorationRanking(signal,offset))
 return <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
  <div className="flex items-center justify-between"><h3 className="text-sm">탐험 랭킹</h3><Button variant="ghost" size="icon" aria-label="순위 새로고침" disabled={query.isFetching} onClick={()=>void query.refetch()}><RotateCcw className="size-4"/></Button></div>
  <p className="text-xs leading-5 text-muted-foreground">전체 기간 · 개인 최고 도달 층 기준<br/>같은 층은 탐험 완료 → 먼저 시작한 기록 순서예요.<br/>실전 탐험만 반영하며, 랭킹 정산 보상은 없어요.</p>
  <ol className={rankingListClass}>{query.data?.rows.map(row=><RankingRow key={row.id} {...row} action={<RankingFriendAction player={row}/>} record={<span className="block">{row.completed?`${row.floor}층 완료`:`지하 ${row.floor}층`}</span>}/>)}</ol>
  {query.data?.total===0&&<p className="py-6 text-center text-sm text-muted-foreground">첫 탐험 기록에 도전해보세요.</p>}
  {query.isPending&&<p role="status" className="text-xs text-muted-foreground">기록을 불러오는 중…</p>}
  {query.error&&<p role="alert" className="text-xs text-destructive">랭킹을 불러오지 못했어요. 새로고침으로 다시 확인해주세요.</p>}
  <div className="flex justify-between"><Button variant="ghost" disabled={query.isFetching||offset===0} onClick={()=>setOffset(Math.max(0,offset-20))}>이전</Button><Button variant="ghost" disabled={query.isFetching||!query.data||offset+20>=query.data.total||offset>=10000} onClick={()=>setOffset(offset+20)}>다음</Button></div>
 </div>
}
