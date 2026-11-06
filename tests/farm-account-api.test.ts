import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {commandAccountFarm,readAccountFarm,FarmAccountError,type FarmAccountSnapshot} from '@/features/farm/account-api'
import {initialAccountFarm} from '@/features/farm/account-engine'
import {setQueryAccount,appQueryClient,accountQueryKey} from '@/lib/account-cache'
const api=vi.hoisted(()=>({invoke:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({functions:{invoke:api.invoke}})}))
const snapshot=(gold=1234):FarmAccountSnapshot=>({state:{...initialAccountFarm(),gold},wallet:{gold,inventory:{},testClaimed:false,testEnabled:false},revision:1,serverNow:new Date().toISOString(),sampledAt:Date.now(),undo:null,receipt:{operationId:'one-op',applied:true,delta:-100}})
beforeEach(()=>{setQueryAccount('one');api.invoke.mockReset()})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear();vi.restoreAllMocks()})
it('forwards read cancellation and publishes the confirmed wallet without storing a second local copy',async()=>{
 const signal=new AbortController().signal;api.invoke.mockResolvedValue({data:snapshot(),error:null})
 const result=await readAccountFarm(signal)
 expect(api.invoke).toHaveBeenCalledWith('farm-game',{body:{},signal})
 expect(appQueryClient.getQueryData(accountQueryKey('one','wallet'))).toEqual(result.wallet)
})
it('publishes both confirmed resources and retains the caller operation ID',async()=>{
 api.invoke.mockResolvedValue({data:snapshot(),error:null})
 const result=await commandAccountFarm({type:'buyLand',quantity:1},0,'stable-op')
 expect(api.invoke.mock.calls[0][1].body).toEqual({command:{type:'buyLand',quantity:1},revision:0,operationId:'stable-op'})
 expect(appQueryClient.getQueryData(accountQueryKey('one','farm'))).toEqual(result)
 expect(appQueryClient.getQueryData(accountQueryKey('one','wallet'))).toEqual(result.wallet)
})
it('does not automatically retry an unknown transaction and distinguishes a definite conflict',async()=>{
 api.invoke.mockResolvedValueOnce({data:null,error:new Error('network')})
 await expect(commandAccountFarm({type:'buyLand',quantity:1},0,'same-op')).rejects.toMatchObject({definitive:false})
 expect(api.invoke).toHaveBeenCalledTimes(1)
 api.invoke.mockResolvedValueOnce({data:null,error:{context:new Response(JSON.stringify({error:'FARM_STATE_CONFLICT'}),{status:409})}})
 await expect(commandAccountFarm({type:'buyLand',quantity:1},0,'same-op')).rejects.toBeInstanceOf(FarmAccountError)
 expect(appQueryClient.getQueryData(accountQueryKey('one','farm'))).toBeUndefined()
})
it('discards a late previous-account success and its wallet effect',async()=>{
 let resolve!:(value:unknown)=>void;api.invoke.mockImplementation(()=>new Promise(r=>{resolve=r}))
 const event=vi.spyOn(window,'dispatchEvent')
 const request=commandAccountFarm({type:'buyLand',quantity:1},0,'same-op')
 setQueryAccount('two');resolve({data:snapshot(),error:null})
 await expect(request).rejects.toThrow('ACCOUNT_CHANGED')
 expect(appQueryClient.getQueryData(accountQueryKey('two','farm'))).toBeUndefined()
 expect(appQueryClient.getQueryData(accountQueryKey('two','wallet'))).toBeUndefined()
 expect(event).not.toHaveBeenCalled()
})
