import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {appQueryClient,accountQueryKey,setQueryAccount} from '@/lib/account-cache'
import {loadRelics} from '@/features/relics/api'
import {recycleRelics} from '@/features/relics/recycling-api'
const client=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>client}))
const state={relics:[],equippedId:null,changeFee:500,equipFee:0,unequipFee:500}
const request={action:'recombine' as const,inputs:[{id:'a',quantity:6}],operation:'stable-operation'}
const response={...state,recycling:{action:'recombine',cost:0,receivedIds:['b'],consumed:request.inputs,unequipped:false}}
beforeEach(()=>{setQueryAccount('one');client.rpc.mockImplementation(name=>name==='relic_state'?{abortSignal:async()=>({data:state,error:null})}:Promise.resolve({data:response,error:null}))})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear();vi.resetAllMocks()})
it('publishes the complete confirmed inventory without a second read and invalidates collection data',async()=>{
 await loadRelics();appQueryClient.setQueryData(accountQueryKey('one','collection'),{catalog:[]});appQueryClient.setQueryData(accountQueryKey('one','titles'),{titles:[]})
 await expect(recycleRelics(request)).resolves.toEqual(response)
 expect(client.rpc).toHaveBeenLastCalledWith('recycle_relics',{p_action:'recombine',p_inputs:request.inputs,p_operation_id:request.operation})
 expect(client.rpc).toHaveBeenCalledTimes(2);expect(appQueryClient.getQueryData(accountQueryKey('one','relics'))).toEqual(response)
 expect(appQueryClient.getQueryState(accountQueryKey('one','collection'))?.isInvalidated).toBe(true)
 expect(appQueryClient.getQueryState(accountQueryKey('one','titles'))?.isInvalidated).toBe(true)
})
it('does not publish a failed or late old-account transaction into the current account',async()=>{
 await loadRelics();client.rpc.mockResolvedValueOnce({data:null,error:{code:'P0001',message:'RELIC_MATERIAL_UNAVAILABLE'}})
 await expect(recycleRelics(request)).rejects.toMatchObject({code:'P0001'});expect(appQueryClient.getQueryData(accountQueryKey('one','relics'))).toEqual(state)
 let finish!:(r:unknown)=>void;client.rpc.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}))
 const old=recycleRelics(request);setQueryAccount('two');await loadRelics();finish({data:response,error:null})
 await expect(old).rejects.toThrow('ACCOUNT_CHANGED');expect(appQueryClient.getQueryData(accountQueryKey('two','relics'))).toEqual(state)
})
