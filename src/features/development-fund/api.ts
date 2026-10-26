import {createClient} from '@/lib/client'
import {readAccountResource} from '@/lib/account-cache'
import {accountCommand} from '@/lib/account-command'
export type FundStatus='pending'|'confirmed'|'rejected'
// rank is the shared honor tier for equal totals, not a pagination offset.
export type FundSupporter={userId:string;nickname:string;avatarPath:string|null;totalWon:string;rank:number}
export type FundCheer={id:string;nickname:string;avatarPath:string|null;body:string;createdAt:string;canDelete:boolean}
export type FundCheers={items:FundCheer[];hasMore:boolean}
export type FundState={operator:boolean;summary:{totalWon:string;supporterCount:number;donationCount:number};myPendingCount:number;supporters:FundSupporter[];hasMore:boolean;cheers:FundCheers}
export type FundReport={id:string;userId:string|null;nickname:string|null;avatarPath:string|null;depositorName:string;reportedWon:number;remittedAt:string;message:string;publicProfile:boolean;status:FundStatus;confirmedWon:number|null;confirmedAt:string|null;reviewReason:string;revision:number;createdAt:string;updatedAt:string}
export type FundReports={items:FundReport[];hasMore:boolean}
export type FundDraft={id:string;depositorName:string;reportedWon:number;remittedAt:string;message:string;publicProfile:boolean}
export type FundReview={operationId:string;id:string;action:'confirm'|'reject'|'reopen';revision:number;confirmedWon:number|null;reason:string;bankReference:string|null}
export type FundFilter=FundStatus|'mine'
export async function loadCheers(offset = 0): Promise<FundCheers> {
  return readAccountResource(['development-fund-cheers', offset], async (signal) => {
    const { data, error } = await createClient()
      .rpc('development_fund_cheers', { p_offset: offset })
      .abortSignal(signal)
    if (error) throw error
    return data
  })
}
export async function writeCheer(id: string, body: string | null, remove = false): Promise<void> {
  return accountCommand(
    async () => {
      const { error } = await createClient().rpc('development_fund_cheer', {
        p_id: id,
        p_body: body,
        p_delete: remove,
      })
      if (error) throw error
    },
    { invalidate: ['development-fund', 'development-fund-cheers'] },
  )
}
export async function loadFund(offset = 0): Promise<FundState> {
  return readAccountResource(['development-fund', offset], signal=>readFund(signal,offset))
}
export async function readFund(signal:AbortSignal,offset=0):Promise<FundState>{
  const {data,error}=await createClient().rpc('development_fund_state',{p_offset:offset}).abortSignal(signal)
  if(error)throw error
  return data
}
export async function loadFundReports(
  status: FundFilter = 'mine',
  offset = 0,
): Promise<FundReports> {
  return readAccountResource(['development-fund-reports', status, offset], async (signal) => {
    const { data, error } = await createClient()
      .rpc('development_fund_reports', { p_status: status, p_offset: offset })
      .abortSignal(signal)
    if (error) throw error
    return data
  })
}
export async function submitFund(d: FundDraft): Promise<FundReport> {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('development_fund_submit', {
        p_id: d.id,
        p_depositor_name: d.depositorName,
        p_reported_won: d.reportedWon,
        p_remitted_at: d.remittedAt,
        p_message: d.message,
        p_public_profile: d.publicProfile,
      })
      if (error) throw error
      return data
    },
    { invalidate: ['development-fund', 'development-fund-reports'] },
  )
}
export async function reviewFund(d: FundReview): Promise<FundReport> {
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('development_fund_review', {
        p_operation_id: d.operationId,
        p_id: d.id,
        p_action: d.action,
        p_revision: d.revision,
        p_confirmed_won: d.confirmedWon,
        p_reason: d.reason,
        p_bank_reference: d.bankReference,
      })
      if (error) throw error
      return data
    },
    { invalidate: ['development-fund', 'development-fund-reports'] },
  )
}
export function fundError(cause:unknown){const message=String((cause as {message?:string})?.message??'');const errors:Record<string,string>={AUTH_REQUIRED:'로그인 후 이용해주세요.',FUND_FORBIDDEN:'운영자만 후원을 확인할 수 있어요.',FUND_PROFILE_REQUIRED:'닉네임을 설정한 뒤 신고해주세요.',INVALID_FUND_REPORT:'입금자명·금액·입금 일시를 확인해주세요.',INVALID_FUND_REVIEW:'확인 금액과 메모를 확인해주세요.',FUND_REPORT_LIMIT:'하루 신고 한도에 도달했어요. 기존 신고 내역을 먼저 확인해주세요.',FUND_REPORT_CHANGED:'다른 곳에서 처리된 내역이에요. 목록을 새로 확인해주세요.',FUND_DUPLICATE_TRANSFER:'같은 입금 식별번호로 확인한 후원이 있어요. 중복 입금 신고인지 확인해주세요.',OPERATION_CONFLICT:'이전 요청과 내용이 달라요. 내역을 먼저 확인해주세요.'};return Object.entries(errors).find(([key])=>message.includes(key))?.[1]??'처리 결과를 확인하지 못했어요. 내역을 확인하거나 같은 요청으로 다시 시도해주세요.'}
export const won=(value:string|number)=>BigInt(value).toLocaleString('ko-KR')+'원'
export const bankAccount={bank:'국민은행',display:'943202-00-255268',copy:'94320200255268'} as const
