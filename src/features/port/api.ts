import {createClient} from '@/lib/client'
import type {ExpeditionOutcome} from '@/features/expeditions/api'
export type HarborVessel={id:string;name:string;price:number;duration_minutes:number;fuel_cost:number;fishing_count:number;sprite_path:string;owned:boolean;ownedCount:number}
export type HarborBoat=Omit<HarborVessel,'id'|'ownedCount'>&{id:string;vessel_id:string;instance_no:number;dock_slot:number|null}
export type HarborVoyage={id:string;boat_id:string;vessel_id:string;vessel_snapshot:HarborVessel;departed_at:string;returns_at:string;arrival_seen_at:string|null;claimed_at:string|null}
export type HarborResult=ExpeditionOutcome&{voyageId:string;vesselName:string}
export type HarborState={serverNow:string;fuel:number;fuelPrice:number;dockSlots:number;vessels:HarborVessel[];boats:HarborBoat[];voyages:HarborVoyage[];receipt?:{action:string;voyageId?:string;vesselId?:string;boatId?:string;results?:HarborResult[]};replayed?:boolean}
export type HarborAction={p_action:'buy'|'fuel'|'depart'|'arrive'|'claim'|'claim_all'|'dock'|'store';p_operation_id:string;p_vessel_id?:string;p_voyage_id?:string;p_quantity?:number;p_boat_id?:string;p_slot?:number}
export async function loadHarbor(){const {data,error}=await createClient().rpc('harbor_state');if(error)throw error;return data}
export async function harborAction(args:HarborAction){const {data,error}=await createClient().rpc('harbor_action',args);if(error)throw error;if(args.p_action==='claim'||args.p_action==='claim_all')window.dispatchEvent(new Event('collectibles-changed'));return data}
export function harborError(error:unknown){
 const message=String((error as {message?:string})?.message??'')
 const messages:Record<string,string>={VESSEL_OWNERSHIP_LIMIT:'같은 종류의 배는 최대 2척까지 보유할 수 있어요.',DOCK_RESERVED:'이 자리는 출항한 배가 돌아올 자리예요. 수확 후 교체해 주세요.',DOCK_REQUIRED:'보유한 배 목록에서 선착장에 배치해 주세요.',BOAT_ALREADY_DOCKED:'이미 다른 선착장에 있는 배예요.',INSUFFICIENT_GOLD:'골드가 부족해요.',INSUFFICIENT_FUEL:'기름이 부족해요. 기름을 채워 주세요.',VESSEL_NOT_OWNED:'조선소에서 먼저 배를 구매해 주세요.',VESSEL_ALREADY_OWNED:'이미 보유한 배예요.',VOYAGE_ACTIVE:'이 배는 조업 중이거나 수확을 기다리고 있어요.',VOYAGE_NOT_READY:'아직 조업 중이에요.',VOYAGE_NOT_FOUND:'배의 항해 정보를 다시 확인해 주세요.',OPERATION_CONFLICT:'이전 요청의 결과를 먼저 확인해 주세요.',INVALID_QUANTITY:'기름은 한 번에 1~100개 구매할 수 있어요.'}
 return Object.entries(messages).find(([key])=>message.includes(key))?.[1]??(/PGRST202|harbor_state|harbor_action/.test(message)?'항구 업데이트가 아직 서버에 반영되지 않았어요.':'결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.')
}
