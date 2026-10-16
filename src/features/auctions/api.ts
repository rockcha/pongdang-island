import {createClient} from '@/lib/client'
import type {ExchangeAsset} from '@/features/exchange/api'
export type Auction={id:string;owner_id:string|null;owner_name:string;title:string;description:string;offer:ExchangeAsset;minimum_price:number;duration_days:1|3|7;highest_amount:number;highest_bidder:string|null;status:'active'|'sold'|'unsold'|'cancelled';created_at:string;ends_at:string}
export type AuctionFeed={items:Auction[];total:number;serverNow:string}
export type AuctionPost={p_kind:'collectible'|'bait';p_item_id:string;p_quantity:number;p_title:string;p_description:string;p_minimum_price:number;p_days:1|3|7;p_operation_id:string}
export async function loadAuctions(tab:string,query:string,offset:number):Promise<AuctionFeed>{const {data,error}=await createClient().rpc('auction_state',{p_tab:tab,p_query:query,p_offset:offset});if(error)throw error;return data}
export async function postAuction(args:AuctionPost):Promise<Auction>{const {data,error}=await createClient().rpc('auction_post',args);if(error)throw error;return data}
export async function bidAuction(id:string,amount:number,operation:string):Promise<Auction>{const {data,error}=await createClient().rpc('auction_bid',{p_id:id,p_amount:amount,p_operation_id:operation});if(error)throw error;return data}
export async function cancelAuction(id:string):Promise<Auction>{const {data,error}=await createClient().rpc('auction_cancel',{p_id:id});if(error)throw error;return data}
export function auctionError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 const errors:Record<string,string>={AUCTION_ENDED:'이미 마감된 경매예요. 목록을 새로 확인해주세요.',AUCTION_BID_TOO_LOW:'더 높은 입찰이 들어왔어요. 현재 최고가보다 높은 금액을 입력해주세요.',AUCTION_HAS_BIDS:'입찰이 시작된 경매는 취소할 수 없어요.',AUCTION_SELF_BID:'내 경매에는 입찰할 수 없어요.',AUCTION_LIMIT:'진행 중인 경매는 최대 10개까지 등록할 수 있어요.',INSUFFICIENT_GOLD:'입찰금을 맡기기 위한 골드가 부족해요.',EXCHANGE_INSUFFICIENT_ITEMS:'창고의 개체 또는 보유 미끼 수량이 부족해요.',INVALID_AUCTION:'물품·제목·최저가·기간을 확인해주세요.',INVALID_AUCTION_BID:'올바른 입찰 금액을 입력해주세요.',OPERATION_CONFLICT:'이전 요청 내용을 유지하고 다시 확인해주세요.'}
 return Object.entries(errors).find(([key])=>message.includes(key))?.[1]??'경매를 처리하지 못했어요. 연결을 확인하고 다시 시도해주세요.'
}
