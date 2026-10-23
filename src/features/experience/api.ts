import {createClient} from '@/lib/client'

export type ExperienceState={level:number;totalXp:number;currentXp:number;nextLevelXp:number;legacyXp:number}
export type FriendLevel={friendId:string;level:number}
export type PlayerLevelState={userId:string;level:number}
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

export async function loadExperience():Promise<ExperienceState>{
 const {data,error}=await createClient().rpc('experience_state')
 if(error)throw error
 return data
}
export function experienceChanged(){if(typeof window!=='undefined')window.dispatchEvent(new Event('experience-changed'))}
