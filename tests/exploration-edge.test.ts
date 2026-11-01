// @vitest-environment node
import {beforeAll,beforeEach,afterAll,expect,it,vi} from 'vitest'
import {newExplorationModel} from '../src/features/exploration/server-engine'
let handler:(request:Request)=>Promise<Response>
const fetcher=vi.fn(),id='00000000-0000-0000-0000-000000000123',op='00000000-0000-0000-0000-000000000124'
const request=(action:unknown,extra:object={})=>new Request('https://test.invalid/exploration-game',{method:'POST',headers:{Authorization:'Bearer user-token'},body:JSON.stringify({runId:id,operationId:op,revision:0,action,...extra})})
beforeAll(async()=>{vi.stubGlobal('Deno',{env:{get:(key:string)=>key==='SUPABASE_URL'?'https://test.invalid':'service-key'},serve:(callback:typeof handler)=>{handler=callback}});vi.stubGlobal('fetch',fetcher);await import('../supabase/functions/exploration-game/index.ts')})
beforeEach(()=>fetcher.mockReset())
afterAll(()=>vi.unstubAllGlobals())
it('authenticates independently and initializes only canonical game state',async()=>{
 fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json(null)).mockResolvedValueOnce(Response.json({id,revision:0}))
 expect((await handler(request({type:'start',hp:99999,completed:true},{revision:-1,model:{completed:true},rewardGold:99999,userId:'victim'}))).status).toBe(200)
 const args=JSON.parse(fetcher.mock.calls[2][1].body)
 expect(args).toMatchObject({p_user:'owner',p_run:id,p_revision:-1,p_model:{version:1,state:{hp:100,gold:100,market:{floor:1}}}})
 expect(args.p_model.state.completed).toBeUndefined()
 expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer user-token')
 expect(fetcher.mock.calls[2][1].headers.Authorization).toBe('Bearer service-key')
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
