import {createClient} from '@/lib/client'
import type {FeedbackKind} from './feedback-reactions'
export type FeedbackComment={id:string;author_id:string;author_name:string;avatar_path:string|null;body:string;created_at:string;updated_at:string}
export type FeedbackCommentPage={items:FeedbackComment[];total:number}
export async function loadFeedbackComments(kind:FeedbackKind,id:string,offset=0):Promise<FeedbackCommentPage>{
 const {data,error}=await createClient().rpc('feedback_comments',{p_kind:kind,p_id:id,p_offset:offset})
 if(error)throw error
 if(!data||!Array.isArray(data.items))throw new Error('INVALID_COMMENT_RESPONSE')
 return data
}
export async function feedbackCommentAction(kind:FeedbackKind,id:string,action:'add'|'edit'|'delete',commentId:string,body=''){
 const {data,error}=await createClient().rpc('feedback_comment_action',{p_kind:kind,p_id:id,p_action:action,p_comment_id:commentId,p_body:body})
 if(error)throw error;return data
}
