import {createClient} from '@/lib/client'
export const noticeCategories={update:'업데이트',guide:'안내',maintenance:'버그 수정',event:'이벤트'} as const
export type Notice={id:string;category:keyof typeof noticeCategories;title:string;body:string;images:string[];status:'draft'|'published'|'hidden';pinned:boolean;starts_at:string|null;ends_at:string|null;author_id:string|null;created_at:string;updated_at:string;published_at:string|null;revision:number}
export type NoticeView=Notice&{urls:Record<string,string>}
export type NoticeSave={p_id:string;p_category:Notice['category'];p_title:string;p_body:string;p_images:string[];p_status:Notice['status'];p_pinned:boolean;p_starts_at:string|null;p_ends_at:string|null;p_revision:number}
export const isNoticeOperator=async()=>{const {data,error}=await createClient().rpc('notice_is_operator');if(error)throw error;return data}
async function hydrate(rows:Notice[]):Promise<NoticeView[]>{
 const paths=[...new Set(rows.flatMap(n=>n.images))],urls:Record<string,string>={}
 if(paths.length){const {data,error}=await createClient().storage.from('notice-images').createSignedUrls(paths,3600);if(error)throw error;for(const item of data??[])if(item.path&&item.signedUrl)urls[item.path]=item.signedUrl}
 return rows.map(n=>({...n,urls}))
}
export async function loadNotices(category:string,query:string,page:number,manage:boolean){
 let request=createClient().from('notices').select('*',{count:'exact'}).order('pinned',{ascending:false}).order(manage?'updated_at':'published_at',{ascending:false}).order('id').range(page*20,page*20+19)
 if(!manage)request=request.eq('status','published')
 if(category!=='all'&&category in noticeCategories)request=request.eq('category',category as Notice['category'])
 if(query.trim())request=request.ilike('title',`%${query.replace(/[\\%_]/g,'\\$&')}%`)
 const {data,count,error}=await request;if(error)throw error
 return {items:await hydrate(data??[]),total:count??0}
}
export async function loadNotice(id:string){const {data,error}=await createClient().from('notices').select('*').eq('id',id).maybeSingle();if(error)throw error;return data?(await hydrate([data]))[0]:null}
export async function deleteNotice(id:string,revision:number){const {error}=await createClient().rpc('notice_delete',{p_id:id,p_revision:revision});if(error)throw error}
export async function saveNotice(n:Notice,status:Notice['status']){
 const args:NoticeSave={p_id:n.id,p_category:n.category,p_title:n.title,p_body:n.body,p_images:n.images,p_status:status,p_pinned:n.pinned,p_starts_at:n.starts_at,p_ends_at:n.ends_at,p_revision:n.revision}
 const {data,error}=await createClient().rpc('notice_save',args);if(error)throw error;return (await hydrate([data]))[0]
}
export async function uploadNoticeImage(id:string,file:File){
 const extensions:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}
 if(!extensions[file.type]||file.size>5*1024*1024)throw new Error('IMAGE_LIMIT')
 const path=`${id}/${crypto.randomUUID()}.${extensions[file.type]}`
 const {error}=await createClient().storage.from('notice-images').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error
 const {data,error:signError}=await createClient().storage.from('notice-images').createSignedUrl(path,3600);if(signError)throw signError
 return {path,url:data.signedUrl}
}
export function noticeError(error:unknown){const message=String((error as {message?:string})?.message??'');return message.includes('NOTICE_CHANGED')?'다른 곳에서 수정했거나 저장 응답이 끊겼어요. 공지를 다시 열어 내용을 확인해주세요.':message.includes('NOTICE_FORBIDDEN')?'공지 작성 권한이 없어요.':message.includes('IMAGE_LIMIT')?'PNG·JPG·WebP 이미지를 5MB 이하로 올려주세요.':message.includes('NOTICE_EMPTY')?'본문이나 이미지를 넣어주세요.':message.includes('INVALID_NOTICE')?'제목·내용·기간을 확인해주세요.':'소식을 처리하지 못했어요. 연결을 확인하고 다시 시도해주세요.'}
export function noticeProgress(n:Notice,now=Date.now()){
 if(n.category!=='event')return ''
 if(n.ends_at&&new Date(n.ends_at).getTime()<=now)return '종료'
 if(n.starts_at&&new Date(n.starts_at).getTime()>now)return '예정'
 return n.starts_at?'진행 중':''
}
