import {beforeEach,afterEach,expect,it,vi} from 'vitest'
const mock=vi.hoisted(()=>({create:vi.fn(()=>({}))}))
vi.mock('@supabase/supabase-js',()=>({createClient:mock.create}))
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','public-key')})
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
it('blocks anonymous background RPCs locally and forwards authenticated and public requests',async()=>{
 const network=vi.fn().mockResolvedValue(new Response('{}',{status:200}));vi.stubGlobal('fetch',network)
 const {createClient}=await import('@/lib/client');createClient()
 const send=(mock.create.mock.calls[0] as unknown as [string,string,{global:{fetch:typeof fetch}}])[2].global.fetch
 const blocked=await send('https://example.supabase.co/rest/v1/rpc/sync_titles',{headers:{Authorization:'Bearer public-key'}})
 expect(blocked.status).toBe(401);expect(network).not.toHaveBeenCalled()
 for(const rpc of ['menu_status','notification_inbox']){
  const response=await send('https://example.supabase.co/rest/v1/rpc/'+rpc,{headers:{Authorization:'Bearer public-key'}})
  expect(response.status).toBe(401)
 }
 expect(network).not.toHaveBeenCalled()
 await send('https://example.supabase.co/rest/v1/rpc/sync_titles',{headers:{Authorization:'Bearer user-jwt'}})
 await send('https://example.supabase.co/auth/v1/token',{method:'POST'})
 expect(network).toHaveBeenCalledTimes(2)
})
