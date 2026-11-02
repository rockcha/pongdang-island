import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
import {readSavedExploration,loadSavedExploration} from '@/features/exploration/saved-run-api'
const rpc=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/client',()=>({createClient:()=>({rpc})}))
const data={id:'saved',floor:49,savedAt:'2026-11-02T11:00:00Z',revision:5}
beforeEach(()=>{setQueryAccount('one');rpc.mockReset()})
afterEach(()=>{appQueryClient.clear();setQueryAccount(null)})
it('shares account-scoped save reads and passes cancellation to the RPC',async()=>{
 rpc.mockImplementation(()=>({abortSignal:(signal:AbortSignal)=>{expect(signal).toBeInstanceOf(AbortSignal);return Promise.resolve({data,error:null})}}))
 expect(await Promise.all([loadSavedExploration(),loadSavedExploration()])).toEqual([data,data])
 expect(rpc).toHaveBeenCalledExactlyOnceWith('exploration_saved_run')
})
it('handles no save and rejects malformed save metadata',async()=>{
 const signal=new AbortController().signal
 rpc.mockReturnValueOnce({abortSignal:async()=>({data:null,error:null})})
 expect(await readSavedExploration(signal)).toBeNull()
 rpc.mockReturnValueOnce({abortSignal:async()=>({data:{...data,floor:99},error:null})})
 await expect(readSavedExploration(signal)).rejects.toThrow('INVALID_SAVED_EXPLORATION')
})
it('rejects an old account response after the account changes',async()=>{
 let finish!:(value:unknown)=>void
 rpc.mockReturnValueOnce({abortSignal:()=>new Promise(resolve=>{finish=resolve})})
 const pending=loadSavedExploration().catch(error=>error.message)
 await vi.waitFor(()=>expect(finish).toBeDefined())
 setQueryAccount('two');finish({data,error:null})
 expect(await pending).toMatch(/ACCOUNT_CHANGED|CancelledError/)
})
