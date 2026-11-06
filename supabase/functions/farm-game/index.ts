import {initialAccountFarm,applyFarmCommand,validFarmState} from '../_shared/farm-engine.js'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:cors})
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors})
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405)
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,authorization=req.headers.get('Authorization')??''
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'}
 const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}})
 if(!authorization.startsWith('Bearer ')||!auth.ok)return json({error:'AUTH_REQUIRED'},401)
 const user=await auth.json()
 // Preserve the existing operator-only release boundary. Use the established RPC,
 // not user-editable metadata, to authorize access to this unreleased farm.
 const operator=await fetch(url+'/rest/v1/rpc/notice_is_operator',{method:'POST',headers:{...headers,Authorization:authorization},body:'{}'})
 if(!operator.ok||await operator.json()!==true)return json({error:'FARM_NOT_RELEASED'},403)
 const rpc=async(name:string,args:unknown)=>{
  const result=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(args)})
  const body=await result.json()
  if(!result.ok)throw new Error(body.message??'FARM_UNAVAILABLE')
  return body
 }
 try{
  const text=await req.text();if(text.length>64000)return json({error:'REQUEST_TOO_LARGE'},413)
  const body=JSON.parse(text),command=body.command??null
  if(command&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.operationId??''))return json({error:'INVALID_OPERATION'},400)
  const snapshot=await rpc('topview_farm_snapshot',{p_user_id:user.id,p_initial:initialAccountFarm(),p_operation_id:command?body.operationId:null,p_command:command})
  if(!command||snapshot.receipt)return json(snapshot)
  if(body.revision!==snapshot.revision)return json({error:'FARM_STATE_CONFLICT'},409)
  const before=snapshot.state,now=Date.parse(snapshot.serverNow)
  let next
  try{next=command.type==='undo'&&snapshot.undo?{...snapshot.undo,gold:before.gold,nextId:Math.max(before.nextId,snapshot.undo.nextId)}:applyFarmCommand(before,command,now)}
  catch(cause){return json({error:'FARM_ACTION_REJECTED',message:cause instanceof Error?cause.message:'작업 내용을 확인해주세요.'},400)}
  if(next===before){if(command.type==='tick')return json(snapshot);return json({error:'FARM_ACTION_REJECTED'},400)}
  if(!validFarmState(next))return json({error:'INVALID_FARM_STATE'},400)
  return json(await rpc('topview_farm_commit',{p_user_id:user.id,p_operation_id:body.operationId,p_command:command,p_expected_revision:snapshot.revision,p_expected_gold:before.gold,p_state:next,p_delta:next.gold-before.gold}))
 }catch(cause){
  const message=cause instanceof Error?cause.message:'FARM_UNAVAILABLE'
  if(message.includes('FARM_STATE_CONFLICT'))return json({error:'FARM_STATE_CONFLICT'},409)
  if(/OPERATION_CONFLICT|INVALID_|INSUFFICIENT_GOLD|GOLD_LIMIT/.test(message))return json({error:message.slice(0,160)},400)
  // A lost response may follow a successful commit. Preserve the operation ID
  // on every unclassified/network failure rather than inviting a second charge.
  return json({error:'FARM_UNAVAILABLE'},503)
 }
})
