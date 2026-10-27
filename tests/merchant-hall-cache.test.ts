import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {accountQueryKey,appQueryClient,setQueryAccount,subscribeResourceEvents} from '@/lib/account-cache'
import {deliverMerchant,loadMerchant} from '@/features/merchant/api'
import {loadHall} from '@/features/hall-of-fame/api'
const rpc=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/client',()=>({createClient:()=>({rpc})}))
beforeEach(()=>{vi.clearAllMocks();setQueryAccount('merchant-one')})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear()})
it('shares reads, passes abort signals and isolates personal ranks across accounts',async()=>{
 const abort=vi.fn().mockResolvedValue({data:{rankings:{},personal:{casts:{rank:128}},generatedAt:'now'},error:null})
 rpc.mockReturnValue({abortSignal:abort})
 const [a,b]=await Promise.all([loadHall(),loadHall()])
 expect(a).toBe(b);expect(rpc).toHaveBeenCalledOnce();expect(abort.mock.calls[0][0]).toBeInstanceOf(AbortSignal)
 setQueryAccount('merchant-two')
 await loadHall();expect(rpc).toHaveBeenCalledTimes(2)
 expect(appQueryClient.getQueryData(accountQueryKey('merchant-one','hall'))).toBeUndefined()
})
it('publishes one delivery receipt without another board read and invalidates readiness',async()=>{
 const state={orders:[],serverNow:new Date().toISOString(),receipt:{gold:100}}
 for(const resource of ['menu-status','wallet','hall'])appQueryClient.setQueryData(accountQueryKey('merchant-one',resource),{})
 rpc.mockResolvedValue({data:state,error:null})
 expect(await deliverMerchant('order','same-operation','hello')).toEqual(state)
 expect(rpc).toHaveBeenCalledExactlyOnceWith('deliver_merchant_order',{p_order_id:'order',p_operation_id:'same-operation',p_message:'hello'})
 await loadMerchant()
 expect(rpc).toHaveBeenCalledOnce()
 for(const resource of ['menu-status','wallet','hall'])expect(appQueryClient.getQueryState(accountQueryKey('merchant-one',resource))?.isInvalidated).toBe(true)
 expect(appQueryClient.getQueryState(accountQueryKey('merchant-one','merchant'))?.isInvalidated).toBe(false)
})
it.each(['collectibles-changed','aquarium-changed','gifts-changed'])('invalidates eligible quantities after %s',event=>{
 const unsubscribe=subscribeResourceEvents()
 try{
  for(const resource of ['merchant','menu-status'])appQueryClient.setQueryData(accountQueryKey('merchant-one',resource),{})
  window.dispatchEvent(new Event(event))
  for(const resource of ['merchant','menu-status'])expect(appQueryClient.getQueryState(accountQueryKey('merchant-one',resource))?.isInvalidated).toBe(true)
 }finally{unsubscribe()}
})
