// @vitest-environment node
import {beforeAll,beforeEach,afterAll,expect,it,vi} from 'vitest'
import {newExplorationModel} from '../src/features/exploration/server-engine'
let handler:(request:Request)=>Promise<Response>
const fetcher=vi.fn(),id='00000000-0000-0000-0000-000000000123',op='00000000-0000-0000-0000-000000000124'
const request=(action:unknown,extra:object={})=>new Request('https://test.invalid/exploration-game',{method:'POST',headers:{Authorization:'Bearer user-token'},body:JSON.stringify({runId:id,operationId:op,revision:0,action,...extra})})
it('starts revised rules only for the updated client and preserves cached client starts',async()=>{
 for(const balanceVersion of [undefined,2]){
  fetcher.mockReset()
  fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json(null)).mockResolvedValueOnce(Response.json({id,revision:0}))
  expect((await handler(request({type:'start',growthVersion:1,...(balanceVersion?{balanceVersion}:{})},{revision:-1}))).status).toBe(200)
  const commit=JSON.parse(fetcher.mock.calls[2][1].body)
  expect(commit.p_model.state.balanceVersion).toBe(balanceVersion)
  expect(commit.p_model.state.growth.version).toBe(1)
 }
})
beforeAll(async()=>{vi.stubGlobal('Deno',{env:{get:(key:string)=>key==='SUPABASE_URL'?'https://test.invalid':'service-key'},serve:(callback:typeof handler)=>{handler=callback}});vi.stubGlobal('fetch',fetcher);await import('../supabase/functions/exploration-game/index.ts')})
beforeEach(()=>fetcher.mockReset())
afterAll(()=>vi.unstubAllGlobals())
it('opens normal authenticated starts with authoritative 80-floor state and ignores forged rewards',async()=>{
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json(null)).mockResolvedValueOnce(Response.json({id,revision:0}))
 const response=await handler(request({type:'start',hp:99999,completed:true},{revision:-1,model:{completed:true},rewardGold:99999,userId:'victim'}))
 expect(response.status).toBe(200)
 expect(await response.json()).toMatchObject({id,revision:0})
 expect(fetcher).toHaveBeenCalledTimes(3)
 const commit=JSON.parse(fetcher.mock.calls[2][1].body)
 expect(commit.p_user).toBe('owner')
 expect(commit.p_model).toMatchObject({version:2,state:{hp:100,gold:100,campaignFinalFloor:80}})
 expect(commit.p_model.state.completed).not.toBe(true)
 expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer user-token')
})
it('replays an accepted start receipt without creating another run',async()=>{
 const receipt={id,revision:0,model:newExplorationModel(()=>0)}
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json({receipt}))
 expect(await (await handler(request({type:'start'},{revision:-1}))).json()).toEqual(receipt)
 expect(fetcher).toHaveBeenCalledTimes(2)
})
it('rejects missing authentication, unowned runs, stale versions and forged completion',async()=>{
 expect((await handler(new Request('https://test.invalid',{method:'POST',body:'{}'}))).status).toBe(401)
 expect(fetcher).not.toHaveBeenCalled()
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json(null))
 expect((await handler(request({type:'descend'}))).status).toBe(404)
 const model=newExplorationModel(()=>0)
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json({id,revision:0,model}))
 expect((await handler(request({type:'finish',completed:true,floor:50,rewardGold:2000}))).status).toBe(400)
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json({id,revision:1,model}))
 expect((await handler(request({type:'door',index:0}))).status).toBe(409)
 expect(fetcher.mock.calls.filter(call=>String(call[0]).includes('exploration_server_commit'))).toHaveLength(0)
})
it('returns the stored receipt for a lost-response retry without simulating another random outcome',async()=>{
 const receipt={id,revision:1,rewardGold:2000}
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json({receipt}))
 const response=await handler(request({type:'descend'}))
 expect(await response.json()).toEqual(receipt)
 expect(fetcher).toHaveBeenCalledTimes(2)
})
it('reads the current state without conflicting with the start operation ID',async()=>{
 const current={id,revision:5,model:newExplorationModel(()=>0)}
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json(current))
 expect(await (await handler(request({type:'state'},{operationId:id,revision:-1}))).json()).toEqual(current)
 expect(JSON.parse(fetcher.mock.calls[1][1].body).p_operation).toBeNull()
})
it('computes offered room actions against stored state, ignoring submitted state snapshots',async()=>{
 const initial=newExplorationModel(()=>0),model={...initial,state:{...initial.state,market:{...initial.state.market,doors:['rest-oasis']}}}
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json({id,revision:0,model})).mockResolvedValueOnce(Response.json({id,revision:1}))
 expect((await handler(request({type:'door',index:0},{model:{state:{gold:999999,hp:99999}}}))).status).toBe(200)
 const args=JSON.parse(fetcher.mock.calls[2][1].body)
 expect(args.p_model.view).toBe('room')
 expect(args.p_model.state.hp).toBe(100)
 expect(args.p_model.state.gold).toBe(100)
})
it('routes a stored legacy run to the original engine without upgrading its rules',async()=>{
 const {newExplorationModel:legacyModel}=await import('../supabase/functions/_shared/exploration-engine-v1.js')
 const initial=legacyModel(()=>0),model={...initial,state:{...initial.state,market:{...initial.state.market,doors:['rest-oasis']}}}
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json({id,revision:0,model})).mockResolvedValueOnce(Response.json({id,revision:1}))
 expect((await handler(request({type:'door',index:0}))).status).toBe(200)
 const committed=JSON.parse(fetcher.mock.calls[2][1].body).p_model
 expect(committed.version).toBe(1)
 expect(committed.state.campaignFinalFloor).toBeUndefined()
 expect(committed.view).toBe('room')
})
it('lets the database restore a checkpoint during maintenance without trusting a submitted save',async()=>{
 const model=newExplorationModel(()=>0)
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json({id,revision:0,model})).mockResolvedValueOnce(Response.json({id,revision:1}))
 expect((await handler(request({type:'resume',savedModel:{gold:999999}}))).status).toBe(200)
 expect(JSON.parse(fetcher.mock.calls[2][1].body).p_model).toEqual(JSON.parse(JSON.stringify(model)))
})
it('grants starter magic and growth only to a new start from a capable client',async()=>{
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json(null)).mockResolvedValueOnce(Response.json({id,revision:0}))
 expect((await handler(request({type:'start',growthVersion:1},{revision:-1}))).status).toBe(200)
 const model=JSON.parse(fetcher.mock.calls[2][1].body).p_model
 expect(model.state.growth).toMatchObject({version:1,allocations:{health:0,mana:0,attack:0,magic:0,evasion:0}})
 expect(model.state.spells).toEqual([expect.objectContaining({id:'mana-bolt',mana:5})])
 expect(model.state.equippedSpells).toEqual(['mana-bolt'])
})
it('keeps a saved v2 run unchanged on resume even when a client requests growth',async()=>{
 const model=newExplorationModel(()=>0)
 model.state.market.floor=21
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json({id,revision:0,model})).mockResolvedValueOnce(Response.json({id,revision:1}))
 expect((await handler(request({type:'resume',growthVersion:1}))).status).toBe(200)
 const committed=JSON.parse(fetcher.mock.calls[2][1].body).p_model
 expect(committed).toEqual(JSON.parse(JSON.stringify(model)))
 expect(committed.state.growth).toBeUndefined()
 expect(committed.state.equippedSpells).not.toContain('mana-bolt')
})
