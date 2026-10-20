import {questProgressChanged} from '@/features/quests/progress-events'
import { createClient } from '@/lib/client'
import type { Species } from '@/features/collection/api'
import type {ExchangeAsset} from '@/features/exchange/api'
export const giftReactions={thumbs_up:{emoji:'👍',label:'따봉',sent:'따봉을 보냈어요'},heart:{emoji:'❤️',label:'하트',sent:'하트를 보냈어요'},thanks:{emoji:'🥰',label:'고마움',sent:'고마움을 보냈어요'},laugh:{emoji:'😂',label:'웃음',sent:'웃음을 보냈어요'},celebrate:{emoji:'🎉',label:'축하',sent:'축하를 보냈어요'}} as const
export type GiftReaction=keyof typeof giftReactions
export type GiftRecord={id:string;sender_id:string|null;recipient_id:string|null;sender_name:string;recipient_name:string;species:Species&{exchange_offer?:ExchangeAsset};quantity:number;message:string;status:'pending'|'claimed';reaction:GiftReaction|null;created_at:string;claimed_at:string|null;reacted_at:string|null;source?:'friend'|'exchange'|'system';reward_kind?:'gold'|'bait'|'fuel'|'collectible';reward_id?:string|null}
export type GiftMailbox={items:GiftRecord[];total:number}
export function giftError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 const errors:Record<string,string>={GOLD_LIMIT:'골드 보유 한도에 도달했어요. 골드를 사용한 뒤 다시 받아주세요.',INVENTORY_LIMIT:'물품 보유 한도에 도달했어요. 사용한 뒤 다시 받아주세요.',GIFT_FRIEND_REQUIRED:'지금 친구인 사람에게만 선물을 보낼 수 있어요.',GIFT_RATE_LIMIT:'선물을 많이 보냈어요. 잠시 후 다시 보내주세요.',COLLECTIBLE_NOT_FOUND:'이미 판매하거나 선물한 개체예요. 목록을 다시 불러와주세요.',GIFT_NOT_FOUND:'선물을 찾지 못했어요.',GIFT_UNAVAILABLE:'선물을 받을 수 없어요. 다시 불러와주세요.',GIFT_NOT_CLAIMED:'먼저 선물을 받아주세요.',GIFT_ALREADY_REACTED:'이미 이모지 답장을 보냈어요.',INVALID_GIFT:'수량과 메모를 확인해주세요.',INVALID_RECIPIENT:'받는 친구를 확인해주세요.',OPERATION_CONFLICT:'이전 전송 결과를 확인하려면 같은 친구·수량·메모로 다시 보내주세요.'}
 return Object.entries(errors).find(([key])=>message.includes(key))?.[1]??'선물을 처리하지 못했어요. 23번 SQL 적용과 연결을 확인해주세요.'
}
export async function sendGift(recipientId:string,ids:string[],message:string,operationId:string){const {data,error}=await createClient().rpc('send_collectible_gift',{p_recipient_id:recipientId,p_collectible_ids:ids,p_message:message,p_operation_id:operationId});if(error)throw error;questProgressChanged();return data}
export async function loadGifts(direction:'received'|'sent',offset=0){const {data,error}=await createClient().rpc('gift_mailbox',{p_direction:direction,p_offset:offset});if(error)throw error;return data}
export async function loadGift(id:string){const {data,error}=await createClient().rpc('gift_detail',{p_gift_id:id});if(error)throw error;return data}
export async function claimGift(id:string){const {data,error}=await createClient().rpc('claim_collectible_gift',{p_gift_id:id});if(error)throw error;if(typeof window!=='undefined')window.dispatchEvent(new Event('collectibles-changed'));return data}
export async function reactToGift(id:string,reaction:GiftReaction){const {data,error}=await createClient().rpc('react_to_collectible_gift',{p_gift_id:id,p_reaction:reaction});if(error)throw error;return data}
