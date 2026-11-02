import {createClient} from '@/lib/client'
import {readAccountResource} from '@/lib/account-cache'
export type SavedExplorationRun={id:string;floor:number;savedAt:string;revision:number}
export async function readSavedExploration(signal:AbortSignal):Promise<SavedExplorationRun|null>{
 const {data,error}=await createClient().rpc('exploration_saved_run').abortSignal(signal)
 if(error)throw error
 if(data===null)return null
 if(!data||typeof data.id!=='string'||!Number.isInteger(data.floor)||data.floor<1||data.floor>80||!Number.isInteger(data.revision)||typeof data.savedAt!=='string')throw Error('INVALID_SAVED_EXPLORATION')
 return data
}
export function loadSavedExploration(){return readAccountResource('exploration-saved-run',readSavedExploration)}
