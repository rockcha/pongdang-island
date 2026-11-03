import {createClient} from '@/lib/client'
import {accountCommand} from '@/lib/account-command'
import type {RouletteGrade} from './model'

export type RouletteRelic = {id:string;name:string;description:string;thumbnail_path:string;rarity:Exclude<RouletteGrade,'none'>;quantityBefore?:number;quantityAfter?:number}
export type RouletteSpin = {operationId:string;grade:RouletteGrade;cost:number;createdAt:string;relic:RouletteRelic|null}
export type RouletteState = {gold:number;freeAvailable:boolean;nextCost:number;resetAt:string;serverNow:string;history:RouletteSpin[];odds:Record<RouletteGrade,number>;spin?:RouletteSpin;replayed?:boolean}
export type RouletteRequest = {operation:string;expectedFree:boolean}
export async function readRoulette(signal:AbortSignal):Promise<RouletteState> {
  const {data,error}=await createClient().rpc('relic_roulette_state').abortSignal(signal)
  if(error)throw error
  return data
}
export function spinRoulette(request:RouletteRequest) {
  return accountCommand(async()=>{
    const {data,error}=await createClient().rpc('relic_roulette_spin',{p_operation_id:request.operation,p_expected_free:request.expectedFree})
    if(error)throw error
    if(data.spin?.operationId!==request.operation)throw Error('INVALID_ROULETTE_RECEIPT')
    return data
  },{resource:'relic-roulette',invalidate:['wallet','relics','collection','titles','menu-status']})
}
export function rouletteRejection(cause:unknown) {
  const message=String((cause as {message?:string})?.message??'')
  if(message.includes('ROULETTE_PRICE_CHANGED'))return '무료 횟수가 다른 화면에서 사용됐거나 새 하루가 시작됐어요. 다시 확인해 주세요.'
  if(message.includes('INSUFFICIENT_GOLD'))return '골드가 부족해요. 추가 회전에는 500골드가 필요해요.'
  if(message.includes('OPERATION_CONFLICT'))return '이전 요청과 내용이 달라요. 현재 상태를 다시 확인해 주세요.'
  if(message.includes('AUTH_REQUIRED'))return '로그인 후 이용해 주세요.'
  if(message.includes('ROULETTE_UNAVAILABLE'))return '유물 룰렛을 준비하고 있어요. 잠시 후 다시 이용해 주세요.'
  return null
}
