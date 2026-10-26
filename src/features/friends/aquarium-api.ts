import {readAccountResource} from '@/lib/account-cache'
import {questProgressChanged} from '@/features/quests/progress-events'
import {experienceChanged} from '@/features/experience/api'
import {createClient} from '@/lib/client'
import type {OwnedCollectible} from '@/features/collection/api'
import type {AquariumTank} from '@/features/aquarium/api'
export type FriendAquarium={owner:{id:string;nickname:string;avatar_path:string|null};tanks:AquariumTank[];inhabitants:OwnedCollectible[];backgrounds:{id:string;name:string;image_path:string}[]}
export type FeedingResult={id:string;clicks:number;completed:boolean;replayed:boolean}
export type CleaningResult={id:string;strokes:number;completed:boolean;replayed:boolean}
export async function cleanFriendAquarium(tank:string,operation:string,step:number){const {data,error}=await createClient().rpc('clean_friend_aquarium',{p_tank:tank,p_operation:operation,p_step:step});if(error)throw error;if(data.completed){questProgressChanged();experienceChanged()}return {...data,clicks:data.strokes}}
export async function loadFriendAquarium(owner: string) {
  return readAccountResource(['friend-aquarium', owner], async (signal) => {
    const { data, error } = await createClient()
      .rpc('friend_aquarium', { p_owner: owner })
      .abortSignal(signal)
    if (error) throw error
    return data
  })
}
export async function feedFriendAquarium(tank:string,operation:string,step:number){const {data,error}=await createClient().rpc('feed_friend_aquarium',{p_tank:tank,p_operation:operation,p_step:step});if(error)throw error;if(data.completed){questProgressChanged();experienceChanged()}return data}
export function visitError(cause:unknown){const message=String((cause as {message?:string})?.message??'');return message.includes('FRIENDSHIP_REQUIRED')?'친구 관계를 확인할 수 없어요. 등대에서 다시 확인해주세요.':message.includes('TANK_NOT_FOUND')?'친구의 어항을 찾을 수 없어요.':'불러오지 못했어요. 연결을 확인하고 다시 시도해주세요.'}
