import {createClient} from '@/lib/client'
import {accountCommand} from '@/lib/account-command'
import {readAccountResource} from '@/lib/account-cache'
import type {PetPreviewState} from './pet-preview-model'

export async function readPetHouse(signal:AbortSignal):Promise<PetPreviewState>{
 const {data,error}=await createClient().rpc('pet_house_state').abortSignal(signal)
 if(error)throw error
 return data
}
export const loadPetHouse=()=>readAccountResource('pet-house',readPetHouse)
export function commandPetHouse(command:Record<string,unknown>,operationId:string){
 return accountCommand(async()=>{
  const {data,error}=await createClient().rpc('pet_house_command',{p_operation_id:operationId,p_command:command})
  if(error)throw error
  return data
 },{resource:'pet-house',invalidate:['wallet']})
}
export function petError(cause:unknown){
 const message=cause&&typeof cause==='object'&&'message' in cause?String(cause.message):''
 const errors:Record<string,string>={PET_NEEDS_LOW:'포만도와 애정이 모두 80 이상이어야 해요.',PET_JOB_ACTIVE:'다른 친구의 알바를 먼저 마쳐주세요.',PET_WORKING:'알바를 마친 뒤 함께할 수 있어요.',NO_PET_FOOD:'사료를 먼저 구매해주세요.',INVALID_PET_NAME:'이름은 1~8자로 지어주세요.',INVALID_PET_MATERIAL:'같은 종류의 강화하지 않은 친구를 선택해주세요.',PET_BUSY:'상호작용을 마친 뒤 다시 시도해주세요.',PET_JOB_ALREADY_COMPLETE:'알바가 끝났어요. 보수를 받아주세요.',PET_NOT_FOUND:'펫 목록을 다시 확인해주세요.',OPERATION_CONFLICT:'이전 요청과 달라요. 목록을 새로 불러와주세요.'}
 return Object.entries(errors).find(([key])=>message.includes(key))?.[1]??'요청 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해주세요.'
}
