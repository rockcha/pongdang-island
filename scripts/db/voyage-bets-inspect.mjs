import {loadEnvFile} from 'node:process'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',root='artifacts/voyage-bets'
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
async function api(path,body){const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Management API '+r.status+': '+(await r.text()).slice(0,350));return r.json()}
const identity=await api('');if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Project identity mismatch')
const baitIds=JSON.parse(fs.readFileSync('supabase/voyage-bets/companies.json','utf8')).flatMap(c=>c.baitIds)
const names=['pick_habitat_group','pick_profile_collectible','profile_fishing_rarity','collectible_available_at','web_push_device','push_delivery_current','claim_web_push','get_gold_wallet']
const quote=s=>"'"+s.replaceAll("'","''")+"'"
const [snapshot]=await api('/database/query',{read_only:true,query:`select clock_timestamp() captured_at,
 (select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'kind',s.kind,'rarity',s.rarity,'sell_price',s.sell_price,'native_region_id',s.native_region_id,'is_native',s.is_native,'thumbnail_path',s.thumbnail_path) order by s.id) from public.collectible_species s where s.kind in ('fish','trash','decoration')) species,
 (select jsonb_agg(to_jsonb(w)) from app_private.collectible_event_windows w) event_windows,
 (select jsonb_agg(jsonb_build_object('id',id,'name',name) order by id) from public.regions) regions,
 (select jsonb_agg(to_jsonb(b) order by b.id) from app_private.fishing_bait_balance_profiles b where b.id in (${baitIds.map(quote).join(',')})) profiles,
 (select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'definition',pg_get_functiondef(p.oid)) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in (${names.map(quote).join(',')})) functions,
 (select jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(c.oid))) from pg_constraint c where c.conrelid in ('public.player_wallets'::regclass,'app_private.push_subscriptions'::regclass,'app_private.push_deliveries'::regclass)) constraints,
 (select jsonb_agg(table_schema||'.'||table_name) from information_schema.tables where table_name like 'voyage_bet%') existing_objects,
 (select jsonb_agg(extname) from pg_extension where extname in ('pg_cron','pg_net')) extensions`})
const local=JSON.parse(fs.readFileSync('docs/db/local-schema.json','utf8')).structure.functions
const norm=s=>s.replaceAll('\r\n','\n').trim()
snapshot.functions=snapshot.functions.map(f=>({...f,matchesLocal:norm(f.definition)===norm(local.find(l=>l.schema===f.schema&&l.name===f.name)?.definition??''),sha256:createHash('sha256').update(norm(f.definition)).digest('hex')}))
fs.mkdirSync(root,{recursive:true})
fs.writeFileSync(root+'/preflight.json',JSON.stringify({project,scope:'Only relevant catalog, eight functions, wallet/push constraints, feature object existence and cron extensions; no player data; no full schema comparison',...snapshot},null,2)+'\n')
console.log(JSON.stringify({project,capturedAt:snapshot.captured_at,species:snapshot.species.length,baits:snapshot.profiles.length,functions:snapshot.functions.map(f=>({name:f.name,matchesLocal:f.matchesLocal})),existingObjects:snapshot.existing_objects,extensions:snapshot.extensions},null,2))
