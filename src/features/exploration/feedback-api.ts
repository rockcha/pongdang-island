import {createClient} from '@/lib/client'
import {readAccountResource} from '@/lib/account-cache'
import {accountCommand} from '@/lib/account-command'
export type ExplorationComment={id:string;authorId:string;nickname:string;avatarPath:string|null;body:string;createdAt:string;updatedAt:string;canEdit:boolean;canDelete:boolean}
export type ExplorationComments={items:ExplorationComment[];hasMore:boolean}
export type FeedbackWrite={action:'add'|'edit'|'delete';id:string;body?:string}
export async function readExplorationFeedback(signal:AbortSignal,offset=0):Promise<ExplorationComments>{
 const {data,error}=await createClient().rpc('exploration_feedback',{p_offset:offset}).abortSignal(signal)
 if(error)throw error
 if(!data||!Array.isArray(data.items)||typeof data.hasMore!=='boolean')throw Error('INVALID_FEEDBACK_RESPONSE')
 return data
}
export function loadExplorationFeedback(offset=0){return readAccountResource(['exploration-feedback',offset],signal=>readExplorationFeedback(signal,offset))}
export async function writeExplorationFeedback(write:FeedbackWrite):Promise<void>{
 return accountCommand(async()=>{
  const {error}=await createClient().rpc('exploration_feedback_action',{p_action:write.action,p_id:write.id,p_body:write.body??null})
  if(error)throw error
 },{invalidate:['exploration-feedback']})
}
export function explorationFeedbackError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 if(message.includes('FEEDBACK_RATE_LIMIT'))return '잠시 뒤 다시 남겨주세요. 댓글은 30초에 한 번, 하루 30개까지 작성할 수 있어요.'
 if(message.includes('INVALID_FEEDBACK_BODY'))return '피드백을 1~500자로 적어주세요.'
 if(message.includes('FEEDBACK_PROFILE_REQUIRED'))return '프로필의 닉네임을 설정한 뒤 남겨주세요.'
 if(message.includes('FEEDBACK_FORBIDDEN'))return '다른 유저의 댓글은 수정하거나 삭제할 수 없어요.'
 if(message.includes('FEEDBACK_NOT_FOUND'))return '이미 삭제된 댓글이에요. 목록을 새로 확인해주세요.'
 if(message.includes('ACCOUNT_CHANGED'))return '계정이 변경되었어요. 현재 계정에서 다시 확인해주세요.'
 return '저장 결과를 확인하지 못했어요. 같은 내용으로 다시 확인해주세요.'
}
