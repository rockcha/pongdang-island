import {questProgressChanged} from '@/features/quests/progress-events'
import {createClient} from '@/lib/client'
export type AssetKind='gold'|'bait'|'collectible'
export type ExchangeAsset={kind:AssetKind;id:string;name:string;quantity:number;thumbnail_path:string|null;subtype?:'fish'|'trash'|'decoration';available?:number}
export type ExchangeListing={id:string;owner_id:string;owner_name:string;side:'buy'|'sell';offer:ExchangeAsset;wanted:ExchangeAsset;status:'active'|'completed'|'cancelled';taker_id:string|null;created_at:string;closed_at:string|null}
export type ExchangePage={items:ExchangeListing[];total:number}
export type ExchangeInventory={gold:number;assets:ExchangeAsset[]}
export type ExchangePost={p_side:'sell';p_offer_kind:'bait'|'collectible';p_offer_id:string;p_offer_quantity:number;p_wanted_kind:'gold';p_wanted_id:'gold';p_wanted_quantity:number;p_operation_id:string}
export async function loadExchange(tab:string,query:string,offset:number):Promise<ExchangePage>{const {data,error}=await createClient().rpc('exchange_state',{p_tab:tab,p_query:query,p_offset:offset});if(error)throw error;return data}
export async function loadExchangeInventory():Promise<ExchangeInventory>{const {data,error}=await createClient().rpc('exchange_inventory');if(error)throw error;return data}
export async function postExchange(args:ExchangePost):Promise<ExchangeListing>{const {data,error}=await createClient().rpc('exchange_post',args);if(error)throw error;questProgressChanged();return data}
export async function actExchange(id:string,action:'accept'|'cancel'):Promise<ExchangeListing>{const {data,error}=await createClient().rpc('exchange_action',{p_listing_id:id,p_action:action});if(error)throw error;questProgressChanged();return data}
export function exchangeError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 const errors:Record<string,string>={EXCHANGE_UNAVAILABLE:'이미 판매되었거나 취소된 글이에요. 목록을 다시 확인해주세요.',EXCHANGE_INSUFFICIENT_ITEMS:'창고의 개체 또는 보유 미끼가 부족해요. 전시 중인 개체는 창고로 옮겨주세요.',INSUFFICIENT_GOLD:'보유 골드가 부족해요.',EXCHANGE_LISTING_LIMIT:'거래 중인 글은 최대 10개까지 등록할 수 있어요.',EXCHANGE_SELF_TRADE:'내 판매 글은 구매할 수 없어요.',EXCHANGE_FORBIDDEN:'내 글만 취소할 수 있어요.',INVALID_EXCHANGE_ASSET:'교환 물품과 수량을 확인해주세요.',INVALID_EXCHANGE:'판매 물품과 수량, 골드 가격을 확인해주세요.',OPERATION_CONFLICT:'이전 등록 내용을 바꾸지 말고 결과를 다시 확인해주세요.'}
 return Object.entries(errors).find(([key])=>message.includes(key))?.[1]??'거래를 확인하지 못했어요. 연결을 확인한 뒤 다시 시도해주세요.'
}
export function exchangeChanged(){window.dispatchEvent(new Event('collectibles-changed'));window.dispatchEvent(new Event('exchange-changed'));window.dispatchEvent(new Event('fishing-rods-changed'))}
