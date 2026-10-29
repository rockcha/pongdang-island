import {createClient} from '@/lib/client'
import type {PushPayload} from '../../../supabase/functions/_shared/push-presentation'
export async function readActivePush(signal:AbortSignal){
 const observedBefore=Date.now()
 const {data,error}=await createClient().rpc('web_push_active_notifications').abortSignal(signal)
 if(error)throw error
 return {active:data as unknown as PushPayload[],observedBefore}
}
