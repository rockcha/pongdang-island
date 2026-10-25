import {createClient} from '@/lib/client'
import type {OwnedCollectible,Species} from '@/features/collection/api'
import type {AquariumState,AquariumTank} from '@/features/aquarium/api'

export type TutorialAction='state'|'start'|'catch'|'place'
export type FirstFishingState={required:boolean;step:'inactive'|'ready'|'fishing'|'caught'|'completed';species:Species|null;item:OwnedCollectible|null;tank:AquariumTank|null;aquarium:AquariumState|null;readyAt:string|null;serverNow:string}
export async function firstFishingTutorial(action:TutorialAction='state'):Promise<FirstFishingState>{
 const {data,error}=await createClient().rpc('first_fishing_tutorial',{p_action:action})
 if(error)throw error
 return data
}
export function tutorialError(error:unknown){
 const message=String((error as {message?:string})?.message??'')
 if(message.includes('TUTORIAL_TOO_EARLY'))return '찌가 움직일 때까지 잠시 기다려주세요.'
 if(message.includes('TANK_FULL'))return '첫 어항에 빈자리가 없어요. 잠시 후 다시 시도해주세요.'
 return '진행 내용을 확인하지 못했어요. 연결을 확인하고 다시 눌러주세요. 이미 받은 물고기는 다시 지급되지 않아요.'
}
