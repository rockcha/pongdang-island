import {verifyBilliardsReplay,MAX_BILLIARDS_REPLAY_BYTES,BILLIARDS_ENGINE_VERSION} from '../_shared/billiards-replay.js'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:cors})
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors})
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405)
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,authorization=req.headers.get('Authorization')??''
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'}
 try{
  if(!authorization.startsWith('Bearer '))return json({error:'AUTH_REQUIRED'},401)
  const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}})
  if(!auth.ok)return json({error:'AUTH_REQUIRED'},401)
  const user=await auth.json(),text=await req.text()
  if(text.length>MAX_BILLIARDS_REPLAY_BYTES)return json({error:'REPLAY_TOO_LARGE'},413)
  const body=JSON.parse(text)
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.runId??'')||typeof body.final!=='boolean')return json({error:'INVALID_REQUEST'},400)
  const record=await fetch(url+'/rest/v1/rpc/billiards_record',{method:'POST',headers,body:JSON.stringify({p_user_id:user.id,p_run_id:body.runId})})
  if(!record.ok)return json({error:'RUN_UNAVAILABLE'},record.status>=500?503:404)
  const snapshot=await record.json(),run=snapshot.run
  if(run.finished_at)return json(snapshot)
  if(run.engine_version!==BILLIARDS_ENGINE_VERSION)return json({error:'ENGINE_VERSION_MISMATCH'},409)
  let verified
  try{verified=verifyBilliardsReplay(body.replay,Math.max(0,(Date.now()-Date.parse(run.started_at))/1000))}
  catch{return json({error:'INVALID_REPLAY'},400)}
  const result=await fetch(url+'/rest/v1/rpc/billiards_settle',{method:'POST',headers,body:JSON.stringify({p_user_id:user.id,p_run_id:run.id,p_score:verified.score,p_replay:body.replay,p_final:body.final||!verified.abandoned,p_abandoned:verified.abandoned})})
  if(!result.ok)return json({error:'SETTLEMENT_FAILED'},result.status>=500?503:409)
  return json(await result.json())
 }catch{return json({error:'SERVER_UNAVAILABLE'},503)}
})
