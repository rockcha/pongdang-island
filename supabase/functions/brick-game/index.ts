// The service key stays inside the function. User identity is verified independently.
import {verifyBrickReplay,BRICK_ENGINE_VERSION,MAX_BRICK_REPLAY_BYTES} from '../_shared/brick-replay.js'
import {verifyBrickReplay as verifyLegacyReplay} from '../_shared/brick-replay-v1.js'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:cors})
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors})
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405)
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,authorization=req.headers.get('Authorization')??''
 const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}})
 if(!authorization.startsWith('Bearer ')||!auth.ok)return json({error:'AUTH_REQUIRED'},401)
 const user=await auth.json()
 try{
  const text=await req.text();if(text.length>MAX_BRICK_REPLAY_BYTES)return json({error:'REPLAY_TOO_LARGE'},413)
  const body=JSON.parse(text)
  if(!/^[0-9a-f-]{36}$/i.test(body.runId)||!['checkpoint','finish'].includes(body.action))return json({error:'INVALID_REQUEST'},400)
  const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'}
  const response=await fetch(url+'/rest/v1/brick_game_runs?id=eq.'+body.runId+'&user_id=eq.'+user.id+'&select=*',{headers})
  if(!response.ok)return json({error:'SERVER_UNAVAILABLE'},503)
  const run=(await response.json())[0]
  if(!run)return json({error:'RUN_NOT_FOUND'},404)
  if(run.finished_at)return json(run)
  if(run.engine_version!==1&&run.engine_version!==BRICK_ENGINE_VERSION)return json({error:'ENGINE_VERSION_MISMATCH'},409)
  const oldInputs=run.replay?.inputs??[]
  if(!Array.isArray(body.replay?.inputs)||body.replay.inputs.length<oldInputs.length||oldInputs.some((input:{tick:number;action:string;value?:number},i:number)=>{const next=body.replay.inputs[i];return !next||input.tick!==next.tick||input.action!==next.action||input.value!==next.value}))return json({error:'CHECKPOINT_MISMATCH'},409)
  const verify=run.engine_version===1?verifyLegacyReplay:verifyBrickReplay
  const result=verify(Number(run.seed),body.replay,Math.max(0,(Date.now()-Date.parse(run.started_at))/1000))
  const settlement=await fetch(url+'/rest/v1/rpc/brick_game_settle',{method:'POST',headers,body:JSON.stringify({p_user_id:user.id,p_run_id:run.id,p_score:result.score,p_reward:result.reward,p_replay:body.replay,p_final:body.action==='finish'})})
  if(!settlement.ok)return json({error:'SETTLEMENT_FAILED'},409)
  return json(await settlement.json())
 }catch{return json({error:'INVALID_REPLAY'},400)}
})
