import {createClient} from '@/lib/client'
import type {Species} from '@/features/collection/api'
export const showcaseReactions=[{id:'celebrate',emoji:'🎉',label:'축하해요'},{id:'love',emoji:'😍',label:'멋져요'},{id:'wow',emoji:'👀',label:'부러워요'},{id:'luck',emoji:'🍀',label:'행운 나눠요'},{id:'sad',emoji:'😢',label:'슬퍼요'},{id:'angry',emoji:'😡',label:'화나요'}] as const
export type ShowcaseReaction=typeof showcaseReactions[number]['id']
export type ShowcasePost={id:string;author_id:string;author_name:string;avatar_path:string|null;operation_id:string;caption:string;species:Species;rarity:'epic'|'mythic';region_name:string;caught_at:string;created_at:string;first_discovery:boolean;render_version:1;reactions:Partial<Record<ShowcaseReaction,number>>;my_reaction:ShowcaseReaction|null}
export type ShowcaseFeed={items:ShowcasePost[];total:number}
export type ShowcaseReactionPeople={items:{user_id:string;nickname:string;avatar_path:string|null;reaction:ShowcaseReaction}[];counts:Partial<Record<ShowcaseReaction,number>>;total:number}
export async function loadShowcaseReactionPeople(post:string,reaction:ShowcaseReaction|null,offset=0):Promise<ShowcaseReactionPeople>{
 const {data,error}=await createClient().rpc('showcase_reaction_people',{p_post_id:post,p_reaction:reaction,p_offset:offset})
 if(error)throw error
 return data
}
export async function loadShowcase(mine:boolean,offset:number):Promise<ShowcaseFeed>{
 const client=createClient(),{data,error}=await client.rpc('showcase_feed',{p_mine:mine,p_offset:offset})
 if(error)throw error
 return data
}
export async function publishShowcase(operation:string,caption:string){
 const {data,error}=await createClient().rpc('publish_fishing_showcase',{p_operation_id:operation,p_caption:caption})
 if(error)throw error
 window.dispatchEvent(new Event('showcase-changed'))
 return data
}
export async function publishExpeditionShowcase(source:'trap'|'harbor',trip:string,collectible:string,caption:string){
 const {data,error}=await createClient().rpc('publish_expedition_showcase',{p_source:source,p_trip_id:trip,p_collectible_id:collectible,p_caption:caption})
 if(error)throw error
 window.dispatchEvent(new Event('showcase-changed'))
 return data
}
export async function reactToShowcase(post:string,reaction:ShowcaseReaction|null){
 const {data,error}=await createClient().rpc('react_fishing_showcase',{p_post_id:post,p_reaction:reaction})
 if(error)throw error
 return data
}
export async function deleteShowcase(id:string){
 const {error}=await createClient().rpc('delete_fishing_showcase',{p_post_id:id})
 if(error)throw error
 window.dispatchEvent(new Event('showcase-changed'))
}
export function showcaseError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 if(message.includes('CATCH_NOT_SHAREABLE'))return '낚시·통발·어선으로 획득한 특급·신화만 자랑할 수 있어요.'
 if(message.includes('SHOWCASE_NOT_FOUND'))return '삭제되었거나 찾을 수 없는 자랑이에요.'
 if(message.includes('INVALID_SHOWCASE_REACTION'))return '이 반응을 저장하지 못했어요. 새로고침 후 다시 시도해주세요.'
 if(message.includes('INVALID_SHOWCASE'))return '캡션을 확인해주세요. 200자까지 작성할 수 있어요.'
 return '연결을 확인하고 다시 시도해주세요. 같은 포획은 중복으로 등록되지 않아요.'
}
