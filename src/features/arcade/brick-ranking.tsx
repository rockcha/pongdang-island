import {useEffect,useRef,useState} from 'react'
import {RotateCcw} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {brickLeaderboard,brickError} from './brick-breaker-api'
import type {BrickRanks} from './brick-breaker-api'
import {RankingRow,rankingListClass} from './ranking-row'
import {GoldIcon} from '@/features/gold/gold-provider'
export function BrickRanking(){
 const [data,setData]=useState<BrickRanks|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const alive=useRef(true),lock=useRef(false)
 async function load(offset=0){if(lock.current)return;lock.current=true;setBusy(true);try{const result=await brickLeaderboard(offset);if(alive.current){setData(old=>({...result,rows:offset&&old?[...old.rows,...result.rows]:result.rows}));setError('')}}catch(cause){if(alive.current)setError(brickError(cause))}finally{lock.current=false;if(alive.current)setBusy(false)}}
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false}},[]) // eslint-disable-line react-hooks/exhaustive-deps
 return <div id="brick-rank-panel" role="tabpanel" aria-labelledby="brick-rank-tab" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
  <div className="flex items-center justify-between"><h3 className="text-sm">벽돌깨기 랭킹</h3><Button variant="ghost" size="icon" aria-label="순위 새로고침" disabled={busy} onClick={()=>void load()}><RotateCcw className="size-4"/></Button></div>
  <p className="text-xs leading-5 text-muted-foreground">실전에서 확보한 보상 기준 · 개인 최고 기록<br/>보상이 같으면 확정 점수, 먼저 시작한 순서로 정해져요.</p>
  <ol className={rankingListClass}>{data?.rows.map(row=><RankingRow key={row.id} rank={row.rank} nickname={row.nickname} mine={row.mine} record={<><span className="flex items-center justify-end gap-1"><GoldIcon className="size-4"/>{row.gold}</span><span className="text-xs text-muted-foreground">{row.score}점</span></>}/>)}</ol>
  {data&&!data.total&&<p className="py-6 text-center text-sm text-muted-foreground">첫 실전 기록을 남겨보세요.</p>}
  {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}{busy&&<p role="status" className="text-xs">기록을 불러오는 중…</p>}
  {data&&data.rows.length<data.total&&<Button variant="outline" className="w-full" disabled={busy} onClick={()=>void load(data.rows.length)}>기록 더 보기</Button>}
 </div>
}
