import webpush from 'npm:web-push@3.6.7'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type, x-push-worker-key','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:cors})
const endpointAllowed=(endpoint:string)=>{
 try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&/^(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)$/.test(u.hostname)}catch{return false}
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors})
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405)
 let body:{action?:string}={}
 try{const text=await req.text();if(text.length>1024)return json({error:'REQUEST_TOO_LARGE'},413);body=text?JSON.parse(text):{}}catch{return json({error:'INVALID_REQUEST'},400)}
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
 async function rpc(name:string,args:unknown){
  const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)})
  if(!response.ok)throw Error('RPC_FAILED')
  const text=await response.text();return text?JSON.parse(text):null
 }
 try{
  // Vault is the server-only source. CLI/Edge env secrets are optional overrides.
  const config=await rpc('web_push_worker_configuration',{}) as Record<string,string>
  const publicKey=Deno.env.get('WEB_PUSH_PUBLIC_KEY')??config.WEB_PUSH_PUBLIC_KEY
  const privateKey=Deno.env.get('WEB_PUSH_PRIVATE_KEY')??config.WEB_PUSH_PRIVATE_KEY
  const subject=Deno.env.get('WEB_PUSH_SUBJECT')??config.WEB_PUSH_SUBJECT
  const secret=Deno.env.get('WEB_PUSH_CRON_SECRET')??config.WEB_PUSH_CRON_SECRET
  const configured=!!(publicKey&&privateKey&&subject&&secret)
  if(body.action==='config')return json({configured,publicKey:configured?publicKey:null})
  if(!secret||req.headers.get('x-push-worker-key')!==secret)return json({error:'AUTH_REQUIRED'},401)
  if(!configured)return json({error:'PUSH_NOT_CONFIGURED'},503)
  const deliveries=await rpc('claim_web_push',{p_limit:20}) as {id:number;leaseToken:string;payload:unknown;subscription:{endpoint:string;keys:{p256dh:string;auth:string}}}[]
  let cursor=0,sent=0,failed=0
  await Promise.all(Array.from({length:Math.min(4,deliveries.length)},async()=>{
   while(cursor<deliveries.length){
    const delivery=deliveries[cursor++];let status=400
    if(endpointAllowed(delivery.subscription.endpoint)){
     try{
      const result=await webpush.sendNotification(delivery.subscription,JSON.stringify(delivery.payload),{vapidDetails:{subject:subject!,publicKey:publicKey!,privateKey:privateKey!},TTL:300,urgency:'normal',timeout:10000})
      status=result.statusCode
     }catch(error){status=Number((error as {statusCode?:number}).statusCode)||0}
    }
    await rpc('finish_web_push',{p_id:delivery.id,p_lease_token:delivery.leaseToken,p_status:status})
    if(status>=200&&status<300)sent++;else failed++
   }
  }))
  return json({claimed:deliveries.length,sent,failed})
 }catch{return json({error:'PUSH_WORKER_FAILED'},503)}
})
