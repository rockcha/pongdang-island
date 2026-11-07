import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {accountQueryKey,appQueryClient,setQueryAccount,AccountChangedError} from '@/lib/account-cache'
const mock=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:mock.rpc})}))
import {readFarmFriends,readFriendFarm,setFarmLike} from '@/features/farm/visits-api'
beforeEach(()=>{setQueryAccount('viewer');mock.rpc.mockReset()})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear()})
it('passes AbortSignal to both directory and target-specific read RPCs',async()=>{
 const signal=new AbortController().signal,abortSignal=vi.fn().mockResolvedValue({data:{friends:[]},error:null})
 mock.rpc.mockReturnValue({abortSignal})
 await readFarmFriends(signal);await readFriendFarm('owner',signal)
 expect(mock.rpc.mock.calls).toEqual([['farm_friends'],['friend_farm',{p_owner:'owner'}]])
 expect(abortSignal.mock.calls).toEqual([[signal],[signal]])
})
it('publishes a confirmed like only to the selected owner snapshot',async()=>{
 const data={owner:{id:'one'},likeCount:3,liked:true}
 mock.rpc.mockResolvedValue({data,error:null})
 const other={owner:{id:'two'},likeCount:9};appQueryClient.setQueryData(accountQueryKey('viewer',['friend-farm','two']),other)
 await setFarmLike('one',true)
 expect(mock.rpc).toHaveBeenCalledWith('set_farm_like',{p_owner:'one',p_liked:true})
 expect(appQueryClient.getQueryData(accountQueryKey('viewer',['friend-farm','one']))).toEqual(data)
 expect(appQueryClient.getQueryData(accountQueryKey('viewer',['friend-farm','two']))).toEqual(other)
})
it('does not publish a late like response into another account',async()=>{
 let resolve!:(value:unknown)=>void;mock.rpc.mockReturnValue(new Promise(r=>{resolve=r}))
 const pending=setFarmLike('owner',true),rejected=expect(pending).rejects.toBeInstanceOf(AccountChangedError)
 setQueryAccount('another-viewer');resolve({data:{owner:{id:'owner'},likeCount:1,liked:true},error:null})
 await rejected
 expect(appQueryClient.getQueryData(accountQueryKey('another-viewer',['friend-farm','owner']))).toBeUndefined()
})
