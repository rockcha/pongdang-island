import {questProgressChanged} from '@/features/quests/progress-events'
import {createClient} from '@/lib/client'
import type {Rarity} from '@/lib/game/rarity'
export type Vessel={id:string;name:string;price:number;duration_minutes:number;min_baits:number;max_baits:number;bonus_description:string;owned:boolean}
export const fixedExpeditionVessel:Vessel={id:'dinghy',name:'꼬마 통발',price:0,duration_minutes:15,min_baits:1,max_baits:30,bonus_description:'미끼 1개당 15분 · 최대 30개',owned:true}
export type Catch={firstDiscovery?:boolean;id:string;species:{id:string;name:string;thumbnail_path:string;rarity?:Rarity};bonus:boolean}
export type ExpeditionOutcome={items:Catch[];failed?:number;attempted?:number;succeeded?:number;refunds?:Record<string,number>}
export type ExpeditionBoost={id:string;nickname:string;avatar_path:string|null;minutes:number;created_at:string}
export type Expedition={id:string;region_id:string;departed_at:string;returns_at:string;vessel_snapshot:Vessel;cargo:Record<string,number>;boosts?:ExpeditionBoost[];result?:ExpeditionOutcome}
export type FriendExpedition={friend_id:string;expedition_id:string|null;returns_at:string|null;boosted:boolean}
export type FriendExpeditionState={serverNow:string;friends:FriendExpedition[];replayed?:boolean}
export type FriendExpeditionVisit={serverNow:string;owner:{id:string;nickname:string;avatar_path:string|null};active:Expedition|null;regionName:string|null;boosted:boolean;baits:ExpeditionState['baits']}
export async function loadFriendExpedition(owner:string){const {data,error}=await createClient().rpc('friend_expedition',{p_owner:owner});if(error)throw error;return data}
export async function loadFriendExpeditions(){const {data,error}=await createClient().rpc('friend_expedition_status');if(error)throw error;return data}
export async function boostFriendExpedition(id:string){const {data,error}=await createClient().rpc('boost_friend_expedition',{p_expedition_id:id});if(error)throw error;questProgressChanged();return data}
export type ExpeditionState={minutesPerBait?:number;serverNow:string;testEnabled:boolean;vessels:Vessel[];active:Expedition|null;history:Expedition[];baits:{id:string;name:string;image_path:string}[];receipt?:{result?:ExpeditionOutcome}}
export type ExpeditionAction={p_action:'buy'|'depart'|'claim'|'instant';p_operation_id:string;p_vessel_id?:string;p_region_id?:string;p_cargo?:Record<string,number>;p_expedition_id?:string}
export async function loadExpeditions(){const {data,error}=await createClient().rpc('expedition_state');if(error)throw error;return data}
export async function changeExpedition(args:ExpeditionAction){const {data,error}=await createClient().rpc('expedition_action',args);if(error)throw error;if(args.p_action==='depart'||args.p_action==='claim')questProgressChanged();if(args.p_action!=='buy')window.dispatchEvent(new Event('expedition-changed'));return data}
export function expeditionError(cause:unknown){const message=String((cause as {message?:string})?.message??'');const messages:Record<string,string>={INSUFFICIENT_GOLD:'보유 골드가 부족해요.',EXPEDITION_ACTIVE:'진행 중인 통발 결과를 먼저 수령해주세요.',EXPEDITION_NOT_READY:'아직 물고기를 유인하는 중이에요.',REGION_LOCKED:'잠긴 해역이에요. 지도에서 해역을 열어주세요.',VESSEL_RETIRED:'새 통발 설치에는 꼬마 통발만 사용할 수 있어요.',VESSEL_NOT_OWNED:'통발 정보를 다시 불러와 주세요.',TEST_DISABLED:'즉시 수확 준비 테스트가 종료되었어요.',OPERATION_CONFLICT:'이전 요청의 결과를 먼저 확인해주세요.',PGRST202:'통발 설치 업데이트가 아직 서버에 반영되지 않았어요.'};return Object.entries(messages).find(([key])=>message.includes(key))?.[1]??(message.includes('BAIT')||message.includes('CARGO')?'통발에는 보유한 미끼를 1~30개 넣을 수 있어요.':'처리 결과를 확인하지 못했어요. 다시 시도해주세요.')}
export function duration(minutes:number){return minutes>=60?`${Math.floor(minutes/60)}시간${minutes%60?` ${minutes%60}분`:''}`:`${minutes}분`}
