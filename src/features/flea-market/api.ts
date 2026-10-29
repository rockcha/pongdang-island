import {createClient} from '@/lib/client'
import {accountCommand} from '@/lib/account-command'
import {fuelDisplay} from '@/lib/fuel-display'
import type {ExchangeAsset,ExchangeInventory} from '@/features/exchange/api'
export type FleaItem={id:string;asset:ExchangeAsset;quantity:number;remaining:number;unit_price:number}
export type FleaPost={id:string;owner_id:string;owner_name:string;owner_avatar_path?:string|null;side:'sell'|'buy';title:string;status:'active'|'completed'|'cancelled';escrow_gold:number;created_at:string;items:FleaItem[]}
export type FleaFeed={items:FleaPost[];total:number}
export type FleaFilter={side:'sell'|'buy';query:string;kind:string;mine:boolean;offset:number;sellable?:boolean}
export type FleaDraft={p_side:'sell'|'buy';p_title:string;p_items:{kind:'fuel'|'collectible';id:string;quantity:number;unit_price:number}[];p_operation_id:string}
export type FleaTrade={p_post_id:string;p_items:{id:string;quantity:number}[];p_operation_id:string}
export async function readFlea(filter:FleaFilter,signal:AbortSignal):Promise<FleaFeed>{
 if(filter.sellable){
  const {data,error}=await createClient().rpc('flea_sellable_state',{p_query:filter.query,p_offset:filter.offset}).abortSignal(signal)
  if(error)throw error;return fuelDisplay(data)
 }
 const {data,error}=await createClient().rpc('flea_state',{p_side:filter.side,p_query:filter.query,p_kind:filter.kind,p_mine:filter.mine,p_offset:filter.offset}).abortSignal(signal)
 if(error)throw error;return fuelDisplay(data)
}
export async function readFleaInventory(signal:AbortSignal):Promise<ExchangeInventory>{
 const {data,error}=await createClient().rpc('exchange_inventory',{}).abortSignal(signal)
 if(error)throw error;return fuelDisplay(data)
}
const effects={invalidate:['flea','new-content','flea-inventory','wallet','gifts','gift','inbox','exchange-inventory','storage','merchant','hall','menu-status']}
export function postFlea(args:FleaDraft):Promise<FleaPost>{return accountCommand(async()=>{const {data,error}=await createClient().rpc('flea_post',args);if(error)throw error;return fuelDisplay(data)},effects)}
export function tradeFlea(args:FleaTrade):Promise<FleaPost>{return accountCommand(async()=>{const {data,error}=await createClient().rpc('flea_trade',args);if(error)throw error;return fuelDisplay(data)},effects)}
export function cancelFlea(args:{p_post_id:string;p_operation_id:string}):Promise<FleaPost>{return accountCommand(async()=>{const {data,error}=await createClient().rpc('flea_cancel',args);if(error)throw error;return fuelDisplay(data)},effects)}
export function confirmedFleaFailure(cause:unknown){return /^(P0001|22P02|22003|23514)$/.test(String((cause as {code?:string})?.code??''))}
export function fleaError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 const errors:Record<string,string>={FLEA_STOCK_CHANGED:'남은 수량이 바뀌었어요. 수량을 다시 확인해주세요.',FLEA_CLOSED:'이미 마감된 글이에요.',FLEA_NOT_FOUND:'글을 찾을 수 없어요.',FLEA_SELF_TRADE:'내 글에서는 거래할 수 없어요.',FLEA_FORBIDDEN:'내 글만 마감할 수 있어요.',FLEA_POST_LIMIT:'진행 중인 글은 최대 5개까지 등록할 수 있어요.',FLEA_ITEM_LIMIT:'한 글에 최대 5종, 개체는 합계 100개까지 등록할 수 있어요.',FLEA_GOLD_LIMIT:'골드 보유 한도를 확인해주세요.',EXCHANGE_INSUFFICIENT_ITEMS:'보관함의 물건이 부족해요. 전시 중인 개체는 먼저 보관해주세요.',INSUFFICIENT_GOLD:'보유 골드가 부족해요.',EXCHANGE_BAIT_DISABLED:'미끼는 거래할 수 없어요.',INVALID_EXCHANGE_ASSET:'거래할 수 없는 물건이거나 수량이 올바르지 않아요.',INVALID_FLEA:'제목·수량·개당 가격을 확인해주세요.',OPERATION_CONFLICT:'이전 요청의 내용을 유지한 채 결과를 다시 확인해주세요.'}
 return Object.entries(errors).find(([key])=>message.includes(key))?.[1]??'처리 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해주세요.'
}
