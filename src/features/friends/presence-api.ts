import {createClient} from '@/lib/client'

export type PresenceStatus='online'|'away'|'offline'
export type FriendPresenceState={serverNow:string;friends:{friend_id:string;state:PresenceStatus}[]}
export async function pingPlayerPresence(sessionId:string,state:PresenceStatus,revision:number){
 const {error}=await createClient().rpc('player_presence_ping',{p_session_id:sessionId,p_state:state,p_revision:revision})
 if(error)throw error
}
export async function loadFriendPresence(signal?:AbortSignal):Promise<FriendPresenceState>{
 const query=createClient().rpc('friend_presence_state',{})
 const {data,error}=await (signal?query.abortSignal(signal):query)
 if(error)throw error
 return data
}
