import {createClient} from '@/lib/client'
import {accountCommand} from '@/lib/account-command'
import {initialTopview,type TopviewState} from './topview-model'

export type FarmOwner={id:string;nickname:string;avatar_path:string|null}
export type FarmFriends={self:FarmOwner;likeCount:number;friends:FarmOwner[]}
export type FriendFarm={owner:FarmOwner;serverNow:string;likeCount:number;liked:boolean;layout:Pick<TopviewState,'land'|'paths'|'pathTiles'|'objects'>&{cropJobs:TopviewState['simulation']['cropJobs']}}
export async function readFarmFriends(signal:AbortSignal):Promise<FarmFriends>{
 const {data,error}=await createClient().rpc('farm_friends').abortSignal(signal)
 if(error)throw error
 return data
}
export async function readFriendFarm(owner:string,signal:AbortSignal):Promise<FriendFarm>{
 const {data,error}=await createClient().rpc('friend_farm',{p_owner:owner}).abortSignal(signal)
 if(error)throw error
 return data
}
export function setFarmLike(owner:string,liked:boolean){
 return accountCommand(async()=>{
  const {data,error}=await createClient().rpc('set_farm_like',{p_owner:owner,p_liked:liked})
  if(error)throw error
  return data
 },{resource:['friend-farm',owner]})
}
export function farmVisitState(data:FriendFarm):TopviewState{
 const empty=initialTopview(),{cropJobs,...layout}=data.layout
 return {...empty,...layout,gold:0,landStock:0,tileStock:0,stored:[],simulation:{...empty.simulation,inventory:Object.fromEntries(Object.keys(empty.simulation.inventory).map(k=>[k,0])) as TopviewState['simulation']['inventory'],cropJobs}}
}
