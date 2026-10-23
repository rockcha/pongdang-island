import {createECDH,randomBytes} from 'node:crypto'
import {existsSync,readFileSync,writeFileSync} from 'node:fs'

// Run once; never rotate keys on an ordinary deploy or print private values.
const file='.env.web-push.local'
function env(path){return Object.fromEntries(readFileSync(path,'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}))}
if(!existsSync(file)){
 const key=createECDH('prime256v1');key.generateKeys()
 const config={WEB_PUSH_PUBLIC_KEY:key.getPublicKey().toString('base64url'),WEB_PUSH_PRIVATE_KEY:key.getPrivateKey().toString('base64url'),WEB_PUSH_CRON_SECRET:randomBytes(32).toString('base64url'),WEB_PUSH_SUBJECT:'https://ewafafphiovbpjwogwzn.supabase.co'}
 writeFileSync(file,Object.entries(config).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600})
 console.log('Created ignored .env.web-push.local. Keep this file private and retain it for redeploys.')
}else console.log('Reusing existing private web-push configuration.')
if(process.argv.includes('--configure-worker')){
 const credentials=env('.env.storage.local'),config=env(file),url=credentials.SUPABASE_URL
 if(url!=='https://ewafafphiovbpjwogwzn.supabase.co')throw Error('Unexpected Supabase project')
 const result=await fetch(url+'/rest/v1/rpc/configure_web_push_worker',{method:'POST',headers:{apikey:credentials.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_url:url+'/functions/v1/web-push',p_secret:config.WEB_PUSH_CRON_SECRET,p_keys:{WEB_PUSH_PUBLIC_KEY:config.WEB_PUSH_PUBLIC_KEY,WEB_PUSH_PRIVATE_KEY:config.WEB_PUSH_PRIVATE_KEY,WEB_PUSH_SUBJECT:config.WEB_PUSH_SUBJECT}})})
 if(!result.ok)throw Error(`Worker configuration failed (${result.status})`)
 console.log('Private cron dispatch configured; no secret values printed.')
}
