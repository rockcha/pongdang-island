import {createClient} from './client'
import {getQueryAccount} from './account-cache'
import {hasBackgroundSession} from './background-session'

export type ContentSource='board'|'exchange'|'flea'|'suggestions'|'bugs'|'showcase'|'merchant'
export type LatestContent=Record<ContentSource,string|null>

export async function readNewContent(signal:AbortSignal):Promise<LatestContent>{
 const owner=getQueryAccount()?.owner
 if(!owner||!await hasBackgroundSession(owner)||signal.aborted)throw Error('BACKGROUND_SESSION_REQUIRED')
 const {data,error}=await createClient().rpc('new_content_state').abortSignal(signal)
 if(error)throw error
 return data
}
