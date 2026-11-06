import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {initialAccountFarm} from '@/features/farm/account-engine'
let handler:(request:Request)=>Promise<Response>
const fetcher=vi.fn(),owner='00000000-0000-4000-8000-000000000001',op='00000000-0000-4000-8000-000000000002'
let balance=5000,operator=true,committed=false,loseResponse=false
beforeAll(async()=>{
 vi.stubGlobal('Deno',{env:{get:(name:string)=>name==='SUPABASE_URL'?'https://example.invalid':'server-only-key'},serve:(fn:typeof handler)=>{handler=fn}})
 vi.stubGlobal('fetch',fetcher)
 await import('../supabase/functions/farm-game/index.ts')
})
afterAll(()=>vi.unstubAllGlobals())
beforeEach(()=>{
 balance=5000;operator=true;committed=false;loseResponse=false;fetcher.mockReset()
 fetcher.mockImplementation(async(url:string,options:any)=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:owner})
  if(url.endsWith('/notice_is_operator'))return Response.json(operator)
  if(url.endsWith('/topview_farm_snapshot'))return Response.json({state:{...initialAccountFarm(),gold:balance},revision:committed?1:0,serverNow:new Date(100000).toISOString(),receipt:committed?{operationId:op,applied:false,delta:-2000}:null})
  if(url.endsWith('/topview_farm_commit')){
   const args=JSON.parse(options.body);expect(args.p_user_id).toBe(owner);expect(args.p_delta).toBe(-2000)
   balance+=args.p_delta;committed=true
   if(loseResponse)throw new Error('lost after commit')
   return Response.json({state:args.p_state,revision:1,wallet:{gold:balance},receipt:{applied:true}})
  }
  throw new Error('unexpected request')
 })
})
const request=(body:unknown,auth='Bearer user-jwt')=>new Request('https://example.invalid/farm-game',{method:'POST',headers:{Authorization:auth},body:JSON.stringify(body)})
it('requires authentication and opens the farm to nonoperators',async()=>{
 expect((await handler(request({},''))).status).toBe(401)
 operator=false;expect((await handler(request({}))).status).toBe(200)
 expect(fetcher.mock.calls.some(([url])=>String(url).endsWith('/notice_is_operator'))).toBe(false)
 expect(fetcher.mock.calls.some(([url])=>String(url).endsWith('/topview_farm_commit'))).toBe(false)
})
it('ignores forged user, gold, price and time fields and uses the authenticated owner and server catalog',async()=>{
 const response=await handler(request({operationId:op,revision:0,user_id:'another-user',gold:999999,now:999999999,command:{type:'buy',kind:'mill',quantity:1,price:0}}))
 expect(response.status).toBe(200);expect(balance).toBe(3000)
})
it('treats a lost post-commit response as uncertain and resolves a retry without charging twice',async()=>{
 loseResponse=true;const body={operationId:op,revision:0,command:{type:'buy',kind:'mill',quantity:1}}
 expect((await handler(request(body))).status).toBe(503)
 expect(balance).toBe(3000)
 const retry=await handler(request(body));expect(retry.status).toBe(200)
 expect((await retry.json()).receipt.applied).toBe(false);expect(balance).toBe(3000)
 expect(fetcher.mock.calls.filter(([url])=>String(url).endsWith('/topview_farm_commit'))).toHaveLength(1)
})
it('rejects a stale revision without committing',async()=>{
 expect((await handler(request({operationId:op,revision:9,command:{type:'buy',kind:'mill',quantity:1}}))).status).toBe(409)
 expect(balance).toBe(5000)
})
