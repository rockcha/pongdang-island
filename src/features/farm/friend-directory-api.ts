import {createClient} from '@/lib/client'
import type {FarmFriends} from './visits-api'

// Keep the directory independent of map rendering so the route can fetch it
// while the larger farm editor is still downloading.
export async function readFarmFriends(signal:AbortSignal):Promise<FarmFriends>{
 const {data,error}=await createClient().rpc('farm_friends').abortSignal(signal)
 if(error)throw error
 return data
}
