import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {appQueryClient,accountQueryKey,setQueryAccount} from '@/lib/account-cache'
import {loadExplorationRanking} from '@/features/exploration/ranking-api'
import {commandExploration} from '@/features/exploration/reward-api'
const client=vi.hoisted(()=>({rpc:vi.fn(),functions:{invoke:vi.fn()}}))
vi.mock('@/lib/client',()=>({createClient:()=>client}))
beforeEach(()=>{
 setQueryAccount('one')
 client.rpc.mockImplementation((_name,args)=>({abortSignal:(signal:AbortSignal)=>{expect(signal).toBeInstanceOf(AbortSignal);return Promise.resolve({data:{rows:[],total:0,offset:args.p_offset},error:null})}}))
 client.functions.invoke.mockImplementation(async(_name,{body})=>({data:{id:body.runId,revision:1,model:{version:1},rewardGold:0,finishedAt:null,abandoned:false},error:null}))
})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear();vi.resetAllMocks()})
it('shares ranking requests by account and page and refreshes all pages after authoritative progress',async()=>{
 await Promise.all([loadExplorationRanking(),loadExplorationRanking()]);expect(client.rpc).toHaveBeenCalledTimes(1)
 await loadExplorationRanking(20);expect(client.rpc).toHaveBeenLastCalledWith('exploration_leaderboard',{p_offset:20})
 await commandExploration({runId:'run',operationId:'action',revision:0,action:{type:'descend'}})
 for(const offset of [0,20])expect(appQueryClient.getQueryState(accountQueryKey('one',['exploration-ranking',offset]))?.isInvalidated).toBe(true)
 setQueryAccount('two');await loadExplorationRanking();expect(client.rpc).toHaveBeenCalledTimes(3)
 expect(appQueryClient.getQueryData(accountQueryKey('one',['exploration-ranking',0]))).toBeUndefined()
})
it('accepts cumulative checkpoint rewards and invalidates the wallet only when the paid total increases',async()=>{
 const wallet=accountQueryKey('one','wallet'),runId='checkpoint-run'
 const command=(revision:number)=>commandExploration({runId,operationId:'operation-'+revision,revision,action:{type:'descend'}})
 const receipt=(revision:number,rewardGold:number)=>({id:runId,revision,model:{version:2},rewardGold,finishedAt:rewardGold===4000?'2026-11-02T11:00:00Z':null,abandoned:false})
 appQueryClient.setQueryData(wallet,{gold:100})
 client.functions.invoke.mockResolvedValueOnce({data:receipt(1,2000),error:null})
 expect(await command(0)).toMatchObject({rewardGold:2000})
 expect(appQueryClient.getQueryState(wallet)?.isInvalidated).toBe(true)
 appQueryClient.setQueryData(wallet,{gold:2100})
 client.functions.invoke.mockResolvedValueOnce({data:receipt(2,2000),error:null})
 await command(1)
 expect(appQueryClient.getQueryState(wallet)?.isInvalidated).toBe(false)
 client.functions.invoke.mockResolvedValueOnce({data:receipt(3,4000),error:null})
 expect(await command(2)).toMatchObject({rewardGold:4000})
 expect(appQueryClient.getQueryState(wallet)?.isInvalidated).toBe(true)
 appQueryClient.setQueryData(wallet,{gold:4100})
 client.functions.invoke.mockResolvedValueOnce({data:receipt(1,2000),error:null})
 expect(await command(0)).toMatchObject({revision:3,rewardGold:4000})
 expect(appQueryClient.getQueryState(wallet)?.isInvalidated).toBe(false)
})
it('keeps cached rankings on failed actions and rejects malformed ranking responses',async()=>{
 await loadExplorationRanking()
 client.functions.invoke.mockResolvedValueOnce({data:null,error:Error('offline')})
 await expect(commandExploration({runId:'run',operationId:'action',revision:0,action:{type:'descend'}})).rejects.toThrow('offline')
 expect(appQueryClient.getQueryState(accountQueryKey('one',['exploration-ranking',0]))?.isInvalidated).toBe(false)
 client.rpc.mockReturnValueOnce({abortSignal:async()=>({data:{rows:[],total:0,offset:0},error:null})})
 await expect(loadExplorationRanking(20)).rejects.toThrow('INVALID_RANKING_RESPONSE')
})
it('discards late ranking responses from a previous account',async()=>{
 let finish!:(value:unknown)=>void
 client.rpc.mockReturnValueOnce({abortSignal:()=>new Promise(resolve=>{finish=resolve})})
 const previous=loadExplorationRanking().catch(()=>null)
 await vi.waitFor(()=>expect(finish).toBeDefined())
 setQueryAccount('two');await loadExplorationRanking()
 finish({data:{rows:[{nickname:'이전 계정 기록'}],total:1,offset:0},error:null});await previous
 expect(appQueryClient.getQueryData(accountQueryKey('one',['exploration-ranking',0]))).toBeUndefined()
 expect(appQueryClient.getQueryData(accountQueryKey('two',['exploration-ranking',0]))).toEqual({rows:[],total:0,offset:0})
})
