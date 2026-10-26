import {createClient} from '@/lib/client'
import {readAccountResource} from '@/lib/account-cache'

export type ExperienceState={level:number;totalXp:number;currentXp:number;nextLevelXp:number;legacyXp:number}
export type FriendLevel={friendId:string;level:number}
export type PlayerLevelState={userId:string;level:number;levelProgress?:number}
export async function loadPlayerLevels(ids:string[],friendCodes:string[]=[]):Promise<PlayerLevelState[]>{
 const {data,error}=await createClient().rpc('player_levels',{p_ids:ids,p_friend_codes:friendCodes})
 if(error)throw error
 return data
}

export async function loadFriendLevels():Promise<FriendLevel[]>{
 const {data,error}=await createClient().rpc('friend_levels')
 if(error)throw error
 return data
}

export const loadExperience=():Promise<ExperienceState>=>readAccountResource('experience',readExperience)
export async function readExperience(signal:AbortSignal):Promise<ExperienceState>{
 const {data,error}=await createClient().rpc('experience_state').abortSignal(signal)
 if(error)throw error
 return data
}
export function experienceChanged(){if(typeof window!=='undefined')window.dispatchEvent(new Event('experience-changed'))}
