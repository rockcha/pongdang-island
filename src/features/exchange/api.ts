import {fuelDisplay} from '@/lib/fuel-display'
import {questProgressChanged} from '@/features/quests/progress-events'
import {createClient} from '@/lib/client'
export type AssetKind='gold'|'bait'|'fuel'|'collectible'
export type ExchangeAsset={kind:AssetKind;id:string;name:string;quantity:number;thumbnail_path:string|null;subtype?:'fish'|'trash'|'decoration';sell_price?:number|null;available?:number;items?:ExchangeAsset[]}
export const exchangeOfferItems=(asset:ExchangeAsset)=>asset.items?.length?asset.items:[asset]
export type ExchangeListing={id:string;title?:string|null;owner_id:string;owner_name:string;owner_avatar_path?:string|null;side:'buy'|'sell';offer:ExchangeAsset;wanted:ExchangeAsset;status:'active'|'completed'|'cancelled';taker_id:string|null;created_at:string;closed_at:string|null;like_count?:number;comment_count?:number;liked?:boolean}
export type ExchangeComment={id:string;user_id:string;body:string;created_at:string;author_name:string;author_avatar_path:string|null}
export type ExchangeDetail={listing:ExchangeListing;comments:ExchangeComment[];pageSize:number}
export async function loadExchangeDetail(id:string,offset=0):Promise<ExchangeDetail>{const {data,error}=await createClient().rpc('exchange_listing_detail',{p_listing_id:id,p_offset:offset});if(error)throw error;return fuelDisplay(data)}
export async function editExchangeTitle(id:string,title:string){const {error}=await createClient().rpc('edit_exchange_listing_title',{p_listing_id:id,p_title:title});if(error)throw error}
export async function setExchangeLike(id:string,liked:boolean):Promise<{liked:boolean;like_count:number}>{const {data,error}=await createClient().rpc('set_exchange_listing_like',{p_listing_id:id,p_liked:liked});if(error)throw error;return fuelDisplay(data)}
export async function addExchangeComment(id:string,body:string,operation:string):Promise<string>{const {data,error}=await createClient().rpc('add_exchange_listing_comment',{p_listing_id:id,p_body:body,p_operation_id:operation});if(error)throw error;return fuelDisplay(data)}
export async function deleteExchangeComment(id:string){const {error}=await createClient().rpc('delete_exchange_listing_comment',{p_comment_id:id});if(error)throw error}
export type ExchangePage={items:ExchangeListing[];total:number}
export type ExchangeInventory={gold:number;assets:ExchangeAsset[]}
export type ExchangePost={p_title?:string;p_side:'sell';p_offer_kind:'bait'|'fuel'|'collectible';p_offer_id:string;p_offer_quantity:number;p_wanted_kind:'gold';p_wanted_id:'gold';p_wanted_quantity:number;p_operation_id:string}
export type ExchangeBundlePost={p_title?:string;p_items:{kind:'bait'|'fuel'|'collectible';id:string;quantity:number}[];p_price:number;p_operation_id:string}
export type ExchangeRequest=ExchangePost|ExchangeBundlePost
export async function loadExchange(tab:string,query:string,offset:number):Promise<ExchangePage>{const {data,error}=await createClient().rpc('exchange_state',{p_tab:tab,p_query:query.replaceAll('연료','기름'),p_offset:offset});if(error)throw error;return fuelDisplay(data)}
export async function loadExchangeInventory():Promise<ExchangeInventory>{const {data,error}=await createClient().rpc('exchange_inventory');if(error)throw error;return fuelDisplay(data)}
export async function postExchange(args:ExchangeRequest):Promise<ExchangeListing>{const result='p_items'in args?await createClient().rpc('exchange_post_bundle',args):await createClient().rpc('exchange_post',args);if(result.error)throw result.error;questProgressChanged();return fuelDisplay(result.data)}
export async function actExchange(id:string,action:'accept'|'cancel'):Promise<ExchangeListing>{const {data,error}=await createClient().rpc('exchange_action',{p_listing_id:id,p_action:action});if(error)throw error;questProgressChanged();return fuelDisplay(data)}
export function exchangeError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 const errors:Record<string,string>={INVALID_EXCHANGE_TITLE:'제목은 줄바꿈 없이 80자 이내로 적어주세요.',EXCHANGE_UNAVAILABLE:'이미 판매되었거나 취소된 글이에요. 목록을 다시 확인해주세요.',EXCHANGE_INSUFFICIENT_ITEMS:'창고의 개체 또는 보유 미끼·연료가 부족해요. 전시 중인 개체는 창고로 옮겨주세요.',INSUFFICIENT_GOLD:'보유 골드가 부족해요.',EXCHANGE_LISTING_LIMIT:'거래 중인 글은 최대 10개까지 등록할 수 있어요.',EXCHANGE_SELF_TRADE:'내 판매 글은 구매할 수 없어요.',EXCHANGE_FORBIDDEN:'내 글만 취소할 수 있어요.',INVALID_EXCHANGE_ASSET:'교환 물품과 수량을 확인해주세요.',INVALID_EXCHANGE:'판매 물품과 수량, 골드 가격을 확인해주세요.',OPERATION_CONFLICT:'이전 등록 내용을 바꾸지 말고 결과를 다시 확인해주세요.'}
 const discussion:Record<string,string>={EXCHANGE_NOT_FOUND:'판매글을 찾을 수 없어요.',INVALID_EXCHANGE_COMMENT:'댓글은 1~500자로 적어주세요.',EXCHANGE_COMMENT_FORBIDDEN:'내 댓글만 삭제할 수 있어요.'}
 return Object.entries({EXCHANGE_BAIT_DISABLED:'미끼는 거래할 수 없어요. 기존 미끼 판매 물품은 우편함에서 돌려받을 수 있어요.',EXCHANGE_BUNDLE_LIMIT:'한 글에 최대 10종, 개체는 합계 20개까지 판매할 수 있어요.',...errors,...discussion}).find(([key])=>message.includes(key))?.[1]??'거래를 확인하지 못했어요. 연결을 확인한 뒤 다시 시도해주세요.'
}
export function exchangeChanged(){window.dispatchEvent(new Event('collectibles-changed'));window.dispatchEvent(new Event('exchange-changed'));window.dispatchEvent(new Event('fishing-rods-changed'))}
