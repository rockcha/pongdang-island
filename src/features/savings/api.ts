import {createClient} from '@/lib/client'
import {readAccountResource} from '@/lib/account-cache'
import {accountCommand} from '@/lib/account-command'
export type SavingsAccount={id:string;term_days:3|5|7;daily_amount:number;paid_count:number;started_at:string;closed_at:string|null;close_kind:'matured'|'cancelled'|'missed'|null;payout:number|null;principal:number;bonusPercent:number;expectedBonus:number;expectedPayout:number;maturesAt:string;nextOpenAt:string|null;depositDeadline:string|null;status:'waiting'|'due'|'matured'|'missed'|'closed'}
export type SavingsState={account:SavingsAccount|null;history:SavingsAccount[];serverNow:string;gold:number}
export type SavingsAction={p_action:'open'|'deposit'|'withdraw';p_operation_id:string;p_account_id?:string;p_term_days?:number;p_daily_amount?:number}
export type SavingsResult=SavingsState&{receipt:{action:SavingsAction['p_action'];accountId:string;paidCount:number;payout:number;bonus:number;closeKind:SavingsAccount['close_kind']};replayed:boolean}
export const loadSavings=()=>readAccountResource('savings',readSavings)
export async function readSavings(signal:AbortSignal){const {data,error}=await createClient().rpc('savings_state').abortSignal(signal);if(error)throw error;return data}
export async function changeSavings(args: SavingsAction) {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('savings_action', args)
      if (error) throw error
      return data
    },
    { resource: 'savings', event: 'savings-changed' },
  )
}
export function savingsError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 const messages:Record<string,string>={AUTH_REQUIRED:'로그인이 필요해요.',INVALID_SAVINGS_PLAN:'하루 10~5,000골드, 기간은 3·5·7일 중 선택해주세요.',SAVINGS_ALREADY_OPEN:'이미 진행 중인 적금이 있어요.',SAVINGS_NOT_FOUND:'내 적금을 찾지 못했어요. 새로고침해주세요.',SAVINGS_CLOSED:'이미 정산한 적금이에요.',SAVINGS_MISSED:'납입 기한이 지났어요. 넣은 원금을 돌려받을 수 있어요.',SAVINGS_NOT_DUE:'지금은 납입할 수 없어요. 다음 납입 시간을 확인해주세요.',INSUFFICIENT_GOLD:'보유 골드가 부족해요.',GOLD_LIMIT:'받은 뒤 보유 골드가 한도를 넘어요. 골드를 사용한 뒤 다시 받아주세요.',OPERATION_CONFLICT:'이전 요청과 내용이 달라요. 결과를 먼저 확인해주세요.'}
 return Object.entries(messages).find(([key])=>message.includes(key))?.[1]??'처리 결과를 확인하지 못했어요. 같은 요청의 결과를 다시 확인해주세요.'
}
export function isSavingsRejection(cause:unknown){return /AUTH_REQUIRED|INVALID_SAVINGS|SAVINGS_|INSUFFICIENT_GOLD|GOLD_LIMIT|OPERATION_CONFLICT/.test(String((cause as {message?:string})?.message??''))}
