import {createClient} from '@/lib/client'
import {readAccountResource} from '@/lib/account-cache'
import type {RankingFriend} from '@/features/arcade/ranking-friend-action'
export type ExplorationRankingRow=RankingFriend&{id:string;rank:number;nickname:string;mine:boolean;floor:number;completed:boolean}
export type ExplorationRankingData={rows:ExplorationRankingRow[];total:number;offset:number}
export async function readExplorationRanking(signal:AbortSignal,offset=0):Promise<ExplorationRankingData>{
 const {data,error}=await createClient().rpc('exploration_leaderboard',{p_offset:offset}).abortSignal(signal)
 if(error)throw error
 if(!data||!Array.isArray(data.rows)||!Number.isInteger(data.total)||data.offset!==offset)throw Error('INVALID_RANKING_RESPONSE')
 return data
}
export function loadExplorationRanking(offset=0){return readAccountResource(['exploration-ranking',offset],signal=>readExplorationRanking(signal,offset))}
