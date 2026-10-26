import {createClient} from '@/lib/client'
export type SponsorshipTab='active'|'completed'|'mine'
export type SponsorshipPerson={id:string|null;nickname:string;avatarPath:string|null}
export type SponsorshipRecipient=SponsorshipPerson & {slot:number;claimedAt:string}
export type Sponsorship={id:string;owner:SponsorshipPerson;goldEach:number;slots:number;claimedCount:number;totalGold:number;message:string;status:'active'|'completed'|'cancelled';createdAt:string;closedAt:string|null;mine:boolean;received:boolean;recipients:SponsorshipRecipient[];replayed?:boolean}
export type SponsorshipFeed={items:Sponsorship[];hasMore:boolean}
export type SponsorshipDraft={operationId:string;goldEach:number;slots:number;message:string}
export async function loadSponsorships(tab:SponsorshipTab,offset=0):Promise<SponsorshipFeed>{
 const {data,error}=await createClient().rpc('sponsorship_state',{p_tab:tab,p_offset:offset});if(error)throw error;return data
}
export async function loadSponsorship(id:string):Promise<Sponsorship>{
 const {data,error}=await createClient().rpc('sponsorship_detail',{p_id:id});if(error)throw error;return data
}
function changed(){window.dispatchEvent(new Event('wallet-changed'))}
export async function createSponsorship(draft:SponsorshipDraft):Promise<Sponsorship>{
 const {data,error}=await createClient().rpc('sponsorship_create',{p_operation_id:draft.operationId,p_gold_each:draft.goldEach,p_slots:draft.slots,p_message:draft.message});if(error)throw error;changed();return data
}
export async function claimSponsorship(id:string):Promise<Sponsorship>{
 const {data,error}=await createClient().rpc('sponsorship_claim',{p_id:id});if(error)throw error;changed();return data
}
export async function cancelSponsorship(id:string):Promise<Sponsorship>{
 const {data,error}=await createClient().rpc('sponsorship_cancel',{p_id:id});if(error)throw error;changed();return data
}
export function sponsorshipError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 const errors:Record<string,string>={AUTH_REQUIRED:'로그인 후 이용해주세요.',SPONSORSHIP_ALREADY_ACTIVE:'진행 중인 내 후원이 있어요. 내 후원·수령에서 확인해주세요.',INSUFFICIENT_GOLD:'보유 골드가 부족해요.',GOLD_LIMIT:'골드 보유 한도에 도달했어요. 골드를 사용한 뒤 다시 시도해주세요.',SPONSORSHIP_SELF_CLAIM:'내가 연 후원은 받을 수 없어요.',SPONSORSHIP_CLOSED:'방금 후원이 종료됐어요. 다른 후원을 확인해주세요.',SPONSORSHIP_NOT_FOUND:'후원을 찾을 수 없어요. 목록을 다시 확인해주세요.',SPONSORSHIP_CANNOT_CANCEL:'이미 수령한 사람이 있어 취소할 수 없어요.',SPONSORSHIP_FORBIDDEN:'내가 연 후원만 취소할 수 있어요.',INVALID_SPONSORSHIP:'금액·인원·메시지를 다시 확인해주세요.',OPERATION_CONFLICT:'이전 요청과 내용이 달라요. 내 후원·수령에서 등록 결과를 먼저 확인해주세요.'}
 return Object.entries(errors).find(([key])=>message.includes(key))?.[1]??'연결을 확인한 뒤 다시 시도해주세요. 등록 재시도는 같은 후원으로 처리돼요.'
}
