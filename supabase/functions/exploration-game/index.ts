import {newRunModel,applyRunAction} from '../_shared/exploration-routing.js'
const EXPLORATION_STARTS_PAUSED = false
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:cors})
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors})
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405)
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,authorization=req.headers.get('Authorization')??''
 if(!authorization.startsWith('Bearer '))return json({error:'AUTH_REQUIRED'},401)
 const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}})
 if(!auth.ok)return json({error:'AUTH_REQUIRED'},401)
 const user=await auth.json()
 try{
  if(Number(req.headers.get('content-length')??0)>4096)return json({error:'REQUEST_TOO_LARGE'},413)
  const text=await req.text();if(text.length>4096)return json({error:'REQUEST_TOO_LARGE'},413)
  const body=JSON.parse(text)
  if(!uuid(body.runId)||!uuid(body.operationId)||!body.action||typeof body.action.type!=='string'||!Number.isSafeInteger(body.revision)||body.revision< -1)return json({error:'INVALID_REQUEST'},400)
  const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'}
  const rpc=async(name:string,args:unknown)=>{
   const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(args)})
   if(!response.ok){const error=await response.json();throw Error(error.message??'SERVER_UNAVAILABLE')}
   return response.json()
  }
  const request={...body.action,revision:body.revision}
  const args={p_user:user.id,p_run:body.runId,p_operation:body.action.type==='state'?null:body.operationId,p_request:request}
  const current=await rpc('exploration_server_state',args)
  if(body.action.type==='state')return current?json(current):json({error:'RUN_NOT_FOUND'},404)
  if(current?.receipt)return json(current.receipt)
  let model
  if(body.action.type==='start'){
   if(current)return json({error:'RUN_EXISTS'},409)
   if(body.revision!==-1)return json({error:'INVALID_REQUEST'},400)
   if(EXPLORATION_STARTS_PAUSED)return json({error:'EXPLORATION_START_PAUSED',message:'버그 점검으로 새 실전 탐험 입장을 잠시 중단했습니다.'},503)
   // Cached clients cannot render adept spell IDs. Opt in only after the UI refreshes.
   model=newRunModel(body.action.growthVersion,Math.random,body.action.balanceVersion??1)
  }else{
   if(!current)return json({error:'RUN_NOT_FOUND'},404)
   if(current.abandoned||current.finishedAt)return json({error:'RUN_CLOSED'},409)
   if(current.revision!==body.revision)return json({error:'REVISION_CONFLICT'},409)
   if(![1,2].includes(current.model.version))return json({error:'ENGINE_VERSION_MISMATCH'},409)
   model=['leave','resume'].includes(body.action.type)?current.model:applyRunAction(current.model,body.action,Date.now())
  }
  return json(await rpc('exploration_server_commit',{...args,p_revision:body.revision,p_model:model}))
 }catch(cause){
  const message=cause instanceof Error?cause.message:''
  if(['REVISION_CONFLICT','OPERATION_CONFLICT','RUN_CLOSED','NO_SAVED_EXPLORATION'].includes(message))return json({error:message},409)
  return json({error:'INVALID_EXPLORATION_ACTION'},400)
 }
})
