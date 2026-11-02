import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import {appQueryClient,accountQueryKey,setQueryAccount} from '@/lib/account-cache'
import {equipTitle,loadTitles,syncTitles} from '@/features/titles/api'
const client=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>client}))
const state={equipped:null,titles:[]}
beforeEach(()=>{setQueryAccount('one');client.rpc.mockImplementation(name=>name==='title_state'?{abortSignal:async(signal:AbortSignal)=>{expect(signal).toBeInstanceOf(AbortSignal);return {data:state,error:null}}}:Promise.resolve({data:name==='sync_titles'?0:{...state,equipped:'a'},error:null}))})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear();vi.resetAllMocks()})
it('shares reads, publishes equipped state, and does not invalidate on an idle sync',async()=>{
 await Promise.all([loadTitles(),loadTitles()]);expect(client.rpc).toHaveBeenCalledTimes(1)
 await equipTitle('a');expect(appQueryClient.getQueryData(accountQueryKey('one','titles'))).toEqual({...state,equipped:'a'})
 await syncTitles();expect(appQueryClient.getQueryState(accountQueryKey('one','titles'))?.isInvalidated).toBe(false)
 client.rpc.mockResolvedValueOnce({data:1,error:null});await syncTitles();expect(appQueryClient.getQueryState(accountQueryKey('one','titles'))?.isInvalidated).toBe(true)
})
it('does not publish a late old-account equipment reply into the next account',async()=>{
 let finish!:(v:unknown)=>void;client.rpc.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}))
 const old=equipTitle('a');setQueryAccount('two');await loadTitles();finish({data:{...state,equipped:'a'},error:null})
 await expect(old).rejects.toThrow('ACCOUNT_CHANGED');expect(appQueryClient.getQueryData(accountQueryKey('two','titles'))).toEqual(state)
})
