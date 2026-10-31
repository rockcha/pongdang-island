import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {appQueryClient,accountQueryKey,setQueryAccount} from '@/lib/account-cache'
import {loadExplorationFeedback,writeExplorationFeedback} from '@/features/exploration/feedback-api'
const client=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>client}))
beforeEach(()=>{setQueryAccount('one');client.rpc.mockImplementation((name,args)=>name==='exploration_feedback'?{abortSignal:(signal:AbortSignal)=>{expect(signal).toBeInstanceOf(AbortSignal);return Promise.resolve({data:{items:[],hasMore:false,offset:args.p_offset},error:null})}}:Promise.resolve({data:args.p_id,error:null}))})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear();vi.resetAllMocks()})
it('shares requests by account and page and invalidates feedback after a confirmed write',async()=>{
 await Promise.all([loadExplorationFeedback(0),loadExplorationFeedback(0)])
 expect(client.rpc).toHaveBeenCalledTimes(1)
 await loadExplorationFeedback(20);expect(client.rpc).toHaveBeenCalledTimes(2)
 await writeExplorationFeedback({action:'add',id:'stable-uuid',body:'같은 요청'})
 expect(client.rpc).toHaveBeenLastCalledWith('exploration_feedback_action',{p_action:'add',p_id:'stable-uuid',p_body:'같은 요청'})
 expect(appQueryClient.getQueryState(accountQueryKey('one',['exploration-feedback',0]))?.isInvalidated).toBe(true)
 expect(appQueryClient.getQueryState(accountQueryKey('one',['exploration-feedback',20]))?.isInvalidated).toBe(true)
})
it('preserves cached comments after a rejected write and isolates the next account from a late old-account write',async()=>{
 await loadExplorationFeedback()
 client.rpc.mockResolvedValueOnce({data:null,error:Error('FEEDBACK_FORBIDDEN')})
 await expect(writeExplorationFeedback({action:'delete',id:'not-owned'})).rejects.toThrow('FEEDBACK_FORBIDDEN')
 expect(appQueryClient.getQueryState(accountQueryKey('one',['exploration-feedback',0]))?.isInvalidated).toBe(false)
 let finish!:(value:unknown)=>void
 client.rpc.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}))
 const oldWrite=writeExplorationFeedback({action:'add',id:'pending-uuid',body:'이전 계정'})
 setQueryAccount('two');await loadExplorationFeedback()
 finish({data:'pending-uuid',error:null})
 await expect(oldWrite).rejects.toThrow('ACCOUNT_CHANGED')
 expect(appQueryClient.getQueryState(accountQueryKey('two',['exploration-feedback',0]))?.isInvalidated).toBe(false)
 expect(appQueryClient.getQueryData(accountQueryKey('one',['exploration-feedback',0]))).toBeUndefined()
})
