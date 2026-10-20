// @vitest-environment node
import {beforeAll,beforeEach,afterAll,expect,it,vi} from 'vitest'
let handler:(request:Request)=>Promise<Response>
const fetcher=vi.fn(),run={id:'00000000-0000-0000-0000-000000000001',user_id:'owner',engine_version:1,seed:42,started_at:new Date(Date.now()-5000).toISOString(),finished_at:null,replay:{ticks:0,inputs:[]}}
beforeAll(async()=>{vi.stubGlobal('Deno',{env:{get:(key:string)=>key==='SUPABASE_URL'?'https://test.invalid':'service-key'},serve:(callback:typeof handler)=>{handler=callback}});vi.stubGlobal('fetch',fetcher);await import('../supabase/functions/brick-game/index.ts')})
beforeEach(()=>{fetcher.mockReset();fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json([run])).mockResolvedValueOnce(Response.json({...run,score:0,reward:0,finished_at:new Date().toISOString()}))})
afterAll(()=>vi.unstubAllGlobals())
const request=(body:unknown)=>new Request('https://test.invalid/brick-game',{method:'POST',headers:{Authorization:'Bearer user-token'},body:JSON.stringify(body)})
it('authenticates the user, filters run ownership and ignores claimed payouts',async()=>{
 const response=await handler(request({action:'finish',runId:run.id,replay:{ticks:0,inputs:[]},score:999,reward:999}))
 expect(response.status).toBe(200)
 expect(fetcher.mock.calls[1][0]).toContain('user_id=eq.owner')
 expect(JSON.parse(fetcher.mock.calls[2][1].body)).toMatchObject({p_user_id:'owner',p_run_id:run.id,p_score:0,p_reward:0,p_final:true})
})
it('rejects missing auth, another owners run and forged input',async()=>{
 fetcher.mockReset();fetcher.mockResolvedValueOnce(Response.json({}, {status:401}))
 expect((await handler(new Request('https://test.invalid',{method:'POST',body:'{}'}))).status).toBe(401)
 fetcher.mockReset();fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json([]))
 expect((await handler(request({action:'finish',runId:run.id,replay:{ticks:0,inputs:[]}}))).status).toBe(404)
 fetcher.mockReset();fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json([run]))
 expect((await handler(request({action:'finish',runId:run.id,replay:{ticks:0,inputs:[{tick:0,action:'hitBrick'}]}}))).status).toBe(400)
 expect(fetcher).toHaveBeenCalledTimes(2)
})
it('compares persisted input prefixes by values regardless of JSON key order',async()=>{
 fetcher.mockReset();fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json([{...run,replay:{ticks:1,inputs:[{action:'launch',tick:0}]}}])).mockResolvedValueOnce(Response.json(run))
 expect((await handler(request({action:'checkpoint',runId:run.id,replay:{ticks:1,inputs:[{tick:0,action:'launch'}]}}))).status).toBe(200)
})
it('replays version 2 target movement and rejects forged target coordinates',async()=>{
 const replay={ticks:60,inputs:[{tick:0,action:'target',value:280},{tick:1,action:'launch'}]}
 fetcher.mockReset();fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json([{...run,engine_version:2}])).mockResolvedValueOnce(Response.json({...run,engine_version:2}))
 expect((await handler(request({action:'checkpoint',runId:run.id,replay}))).status).toBe(200)
 expect(JSON.parse(fetcher.mock.calls[2][1].body)).toMatchObject({p_score:0,p_reward:0,p_replay:replay})
 fetcher.mockReset();fetcher.mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json([{...run,engine_version:2}]))
 expect((await handler(request({action:'checkpoint',runId:run.id,replay:{ticks:1,inputs:[{tick:0,action:'target',value:9999}]}}))).status).toBe(400)
 expect(fetcher).toHaveBeenCalledTimes(2)
})
