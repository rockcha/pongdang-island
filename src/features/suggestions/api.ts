import { createClient } from '@/lib/client'
export type Suggestion = {id:string;author_id:string;author_name:string;title:string;body:string;friends_only:boolean;created_at:string;updated_at:string;adopted_at:string|null;adopted_by:string|null;reward:Record<string,number>}
export type SuggestionDraft = Pick<Suggestion,'id'|'title'|'body'|'friends_only'>
export async function loadSuggestions(page:number,mine:string|null,friendsOf:string|null=null){
 const friendIds=new Set<string>()
 if(friendsOf){
  for(let offset=0;;offset+=500){
   const {data,error}=await createClient().from('friend_requests').select('id,sender_id,recipient_id').eq('status','accepted').or(`sender_id.eq.${friendsOf},recipient_id.eq.${friendsOf}`).order('id').range(offset,offset+499)
   if(error)throw error
   for(const row of data??[])friendIds.add(row.sender_id===friendsOf?row.recipient_id:row.sender_id)
   if((data?.length??0)<500)break
  }
  if(!friendIds.size)return {items:[],total:0}
 }
 let request=createClient().from('suggestion_posts').select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id').range(page*20,page*20+19)
 if(mine)request=request.eq('author_id',mine)
 if(friendsOf)request=request.in('author_id',[...friendIds])
 const {data,count,error}=await request
 if(error)throw error
 return {items:data??[],total:count??0}
}
export async function loadSuggestion(id:string){
 const {data,error}=await createClient().from('suggestion_posts').select('*').eq('id',id).maybeSingle()
 if(error)throw error
 return data
}
export async function saveSuggestion(draft:SuggestionDraft,editing:boolean){
 const values={title:draft.title.trim(),body:draft.body.trim(),friends_only:draft.friends_only}
 const request=editing?createClient().from('suggestion_posts').update(values).eq('id',draft.id):createClient().from('suggestion_posts').insert({id:draft.id,...values})
 const {data,error}=await request.select('*').single()
 // The client keeps the same ID on retry after a lost response.
 if(error?.code==='23505'&&!editing){
  const existing=await loadSuggestion(draft.id)
  if(existing){
   if(existing.title===values.title&&existing.body===values.body&&existing.friends_only===values.friends_only)return existing
   // A user may change visibility while retrying a lost response. Persist that
   // latest choice rather than silently treating the old public post as saved.
   return saveSuggestion(draft,true)
  }
 }
 if(error)throw error
 return data
}
export async function deleteSuggestion(id:string){
 const {data,error}=await createClient().from('suggestion_posts').delete().eq('id',id).select('id').single()
 if(error)throw error
 return data
}
export async function adoptSuggestion(id:string){
 const {data,error}=await createClient().rpc('adopt_suggestion',{p_id:id})
 if(error)throw error
 return data
}
export function suggestionError(cause:unknown){
 const error=cause as {message?:string;code?:string}
 if(error.message?.includes('SUGGESTION_OPERATOR_REQUIRED'))return '운영자만 채택할 수 있어요.'
 if(error.code==='42501'||error.code==='PGRST116')return '글의 공개 범위나 상태가 바뀌었어요. 다시 확인해주세요.'
 if(error.code==='42P01'||error.code==='PGRST205')return '건의함을 준비하고 있어요. 잠시 후 다시 방문해주세요.'
 return '처리하지 못했어요. 연결을 확인하고 다시 시도해주세요.'
}
