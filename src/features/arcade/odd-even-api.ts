import {createClient} from '@/lib/client'
export type OddEvenRun={id:string;stake:number;wins:number;round:number;stage:'choose'|'decision'|'lost'|'banked';pearls:number|null;choice:'odd'|'even'|null}
export type OddEvenState={run:OddEvenRun|null;maxWins:number}
export type OddEvenAction={p_action:'state'|'start'|'answer'|'double'|'cashout';p_operation_id?:string;p_run_id?:string;p_round?:number;p_choice?:'odd'|'even'}
export type OddEvenRank={rank:number;id:string;gold:number;wins:number;nickname:string;mine:boolean;userId?:string;friendCode?:string|null;friendStatus?:'pending'|'accepted'|null}
export type OddEvenRanks={rows:OddEvenRank[];total:number}
export async function oddEvenAction(args:OddEvenAction){const {data,error}=await createClient().rpc('odd_even_game',args);if(error)throw error;return data}
export async function oddEvenLeaderboard(offset=0){const {data,error}=await createClient().rpc('odd_even_leaderboard',{p_offset:offset});if(error)throw error;return data}
export function oddEvenError(cause:unknown){const e=cause as {code?:string;message?:string};if(e.code==='PGRST202'||e.code==='42883')return '게임 서버 설정이 필요해요. 무료 연습은 이용할 수 있어요.';if(e.message?.includes('INSUFFICIENT_GOLD'))return '첫 베팅금 10골드가 부족해요.';if(e.message?.includes('GOLD_LIMIT'))return '골드 보유 한도에 도달했어요. 확보 금액은 보관되어 있어요.';return '연결을 확인하고 다시 시도해주세요. 실전 진행과 확보 금액은 유지돼요.'}
