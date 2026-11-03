import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {buyRouletteTickets,readRoulette,spinRoulette,type RouletteState} from '../src/features/relic-roulette/api'
import {appQueryClient,accountQueryKey,setQueryAccount} from '../src/lib/account-cache'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),abort:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:mocks.rpc})}))
const request={operation:'00000000-0000-0000-0000-000000000123',expectedFree:true}
const receipt:RouletteState={gold:1000,freeAvailable:false,nextCost:500,resetAt:'2026-11-03T15:00:00Z',serverNow:'2026-11-03T00:00:00Z',history:[],odds:{none:60,rare:34,epic:5,mythic:1},spin:{operationId:request.operation,grade:'none',cost:0,relic:null,createdAt:'2026-11-03T00:00:00Z'}}
beforeEach(()=>{setQueryAccount('one');mocks.rpc.mockReset();mocks.abort.mockReset()})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear()})
it('forwards the query AbortSignal to the state RPC',async()=>{
 const signal=new AbortController().signal
 mocks.rpc.mockReturnValue({abortSignal:mocks.abort.mockResolvedValue({data:receipt,error:null})})
 expect(await readRoulette(signal)).toEqual(receipt);expect(mocks.abort).toHaveBeenCalledWith(signal)
})
it('publishes the full receipt and invalidates balances and inventory after one request',async()=>{
 for(const resource of ['wallet','relics','collection','titles','menu-status'])appQueryClient.setQueryData(accountQueryKey('one',resource),{})
 mocks.rpc.mockResolvedValue({data:receipt,error:null})
 await spinRoulette(request)
 expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('relic_roulette_spin',{p_operation_id:request.operation,p_expected_free:true})
 expect(appQueryClient.getQueryData(accountQueryKey('one','relic-roulette'))).toEqual(receipt)
 for(const resource of ['wallet','relics','collection','titles','menu-status'])expect(appQueryClient.getQueryState(accountQueryKey('one',resource))?.isInvalidated).toBe(true)
})
it('drops a late response after switching accounts',async()=>{
 let resolve!:(value:unknown)=>void
 mocks.rpc.mockImplementation(()=>new Promise(done=>{resolve=done}))
 const pending=spinRoulette(request)
 setQueryAccount('two')
 resolve({data:receipt,error:null})
 await expect(pending).rejects.toThrow('ACCOUNT_CHANGED')
 expect(appQueryClient.getQueryData(accountQueryKey('two','relic-roulette'))).toBeUndefined()
})
it('leaves financial retries to the caller and never retries a lost request automatically',async()=>{
 mocks.rpc.mockRejectedValue(Error('network'))
 await expect(spinRoulette(request)).rejects.toThrow('network')
 expect(mocks.rpc).toHaveBeenCalledTimes(1)
 expect(appQueryClient.getQueryData(accountQueryKey('one','relic-roulette'))).toBeUndefined()
})
it('uses the ticket endpoint for new requests while retaining the legacy endpoint for old pending requests',async()=>{
 mocks.rpc.mockResolvedValue({data:receipt,error:null})
 await spinRoulette({...request,useTicket:true})
 expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('relic_roulette_ticket_spin',{p_operation_id:request.operation,p_expected_free:true})
})
it('publishes a validated ticket purchase and refreshes the wallet without spinning',async()=>{
 const data={...receipt,tickets:5,purchase:{operationId:request.operation,quantity:5,totalGold:2500}}
 appQueryClient.setQueryData(accountQueryKey('one','wallet'),{})
 mocks.rpc.mockResolvedValue({data,error:null})
 await buyRouletteTickets({operation:request.operation,quantity:5})
 expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('relic_roulette_buy_tickets',{p_operation_id:request.operation,p_quantity:5})
 expect(appQueryClient.getQueryData(accountQueryKey('one','relic-roulette'))).toEqual(data)
 expect(appQueryClient.getQueryState(accountQueryKey('one','wallet'))?.isInvalidated).toBe(true)
})
it('drops a late ticket purchase after an account change and rejects an invalid receipt',async()=>{
 let resolve!:(value:unknown)=>void
 mocks.rpc.mockImplementation(()=>new Promise(done=>{resolve=done}))
 const promise=buyRouletteTickets({operation:request.operation,quantity:5})
 setQueryAccount('two')
 resolve({data:{...receipt,purchase:{operationId:request.operation,quantity:5,totalGold:2500}},error:null})
 await expect(promise).rejects.toThrow('ACCOUNT_CHANGED')
 expect(appQueryClient.getQueryData(accountQueryKey('two','relic-roulette'))).toBeUndefined()
 mocks.rpc.mockResolvedValue({data:{...receipt,purchase:{operationId:'wrong',quantity:5,totalGold:2500}},error:null})
 await expect(buyRouletteTickets({operation:request.operation,quantity:5})).rejects.toThrow('INVALID_ROULETTE_RECEIPT')
})
