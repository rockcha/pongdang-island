import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {createHash,randomUUID} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',root='assets/storage-upload/new/20261024-110300'
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Wrong project')
const token=process.env.SUPABASE_ACCESS_TOKEN||readFileSync(homedir()+'/.supabase/access-token','utf8').trim()
async function query(sql,readOnly=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql,read_only:readOnly})})
 if(!r.ok){const error=await r.json().catch(()=>({}));throw Error('Management SQL HTTP '+r.status+': '+String(error.message??error.error??'query failed').slice(0,500))}
 return r.json()
}
const quote=s=>"'"+s.replaceAll("'","''")+"'",hash=b=>createHash('sha256').update(b).digest('hex')
const canonical=v=>JSON.stringify(v,(_,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value)
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).harbor_vessels
const ids=manifest.entries.map(e=>e.id),files=['20261024020327_add_harbor_vessel_routes.sql','20261024020746_add_eleven_harbor_vessels.sql']
const functionQuery="select n.nspname as schema,p.proname as name,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='app_private' and p.proname in ('harbor_action','harbor_draw','settle_legacy_harbor','snapshot_harbor_catch_rule')) or (n.nspname='public' and p.proname='harbor_action')"
async function verifyImages(){
 const result=[]
 for(const e of manifest.entries){
  const local=readFileSync(root+'/'+e.storage_path),response=await fetch(`https://${project}.supabase.co/storage/v1/object/public/collectibles/${e.storage_path}`)
  if(!response.ok||hash(Buffer.from(await response.arrayBuffer()))!==hash(local))throw Error('Public image mismatch: '+e.id)
  result.push({id:e.id,sha256:hash(local)})
 }
 return result
}
const mode=process.argv[2]
if(mode==='smoke'){
 const uid=randomUUID(),op=randomUUID(),claim=randomUUID()
 const result=await query(`begin;
 insert into auth.users(id,email,raw_user_meta_data) values(${quote(uid)},${quote('harbor-check-'+uid+'@example.invalid')},'{}');
 insert into public.player_profiles(id,nickname) values(${quote(uid)},${quote('배검증'+uid.slice(0,8))}) on conflict(id) do nothing;
 insert into public.player_wallets(user_id,gold,inventory) values(${quote(uid)},20000,'{"fuel":100}') on conflict(user_id) do update set gold=20000,inventory='{"fuel":100}';
 insert into public.player_map_fragments(user_id,region_id) select ${quote(uid)},id from public.regions on conflict do nothing;
 select set_config('request.jwt.claim.sub',${quote(uid)},true);
 select set_config('harbor.test.region',(select id from public.regions where id<>'pongdang' order by id limit 1),true);
 set local role authenticated;
 select public.harbor_action('buy',gen_random_uuid(),'twin-net');
 select public.harbor_action('buy',gen_random_uuid(),'full-catch');
 select public.harbor_action('depart',${quote(op)},'twin-net',null,1,null,null,'pongdang',current_setting('harbor.test.region'));
 do $$declare result jsonb;begin
 result:=public.harbor_action('depart',${quote(op)},'twin-net',null,1,null,null,'pongdang',current_setting('harbor.test.region'));
 if not (result->>'replayed')::boolean or (result->>'fuel')::integer<>85 then raise exception 'TWIN_RETRY_FAILURE';end if;
 end$$;
 select public.harbor_action('depart',gen_random_uuid(),'full-catch');
 reset role;
 update public.harbor_voyages set departed_at=clock_timestamp()-interval '2 days',returns_at=clock_timestamp()-interval '1 second' where user_id=${quote(uid)};
 set local role authenticated;
 do $$declare result jsonb;r jsonb;begin
 result:=public.harbor_action('claim_all',${quote(claim)});
 if jsonb_array_length(result->'receipt'->'results')<>2 then raise exception 'CLAIM_COUNT_FAILURE';end if;
 for r in select value from jsonb_array_elements(result->'receipt'->'results') loop
 if r->>'vesselName'='만선 보장선' and ((r->>'succeeded')::integer<>12 or (r->>'failed')::integer<>0) then raise exception 'FULL_CATCH_FAILURE';end if;
 if r->>'vesselName'='쌍그물 쌍동선' and ((r->>'attempted')::integer<>22 or position(' · ' in (r->>'regionName'))=0) then raise exception 'TWIN_RESULT_FAILURE';end if;
 end loop;
 if public.harbor_action('claim_all',${quote(claim)})->'receipt' is distinct from result->'receipt' then raise exception 'CLAIM_RETRY_FAILURE';end if;
 end$$;
 reset role;
 rollback;
 select not exists(select 1 from auth.users where id=${quote(uid)}) as rolled_back;`,false)
 if(!result.some(r=>r.rolled_back===true))throw Error('Rollback not verified')
 const reportPath=root+'/remote-verification.json',report=JSON.parse(readFileSync(reportPath,'utf8'))
 report.rollbackSmoke={verifiedAt:new Date().toISOString(),authenticatedPurchases:true,twoRegionDeparture:true,fuelIdempotency:true,fullCatchTwelveRewards:true,claimRetry:true,temporaryAccountRolledBack:true}
 writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n')
 console.log('Remote authenticated purchase, two-region departure, fuel idempotency, full-catch twelve rewards and claim retry passed; temporary account rolled back.')
}
if(mode==='deploy'){
 await verifyImages()
 const before=await query('select * from public.harbor_vessels order by id')
 if(before.some(r=>ids.includes(r.id)))throw Error('New IDs already exist; verify instead of overwriting')
 for(const row of before){if(canonical(row)!==canonical(catalog.find(r=>r.id===row.id)))throw Error('Existing boat drift: '+row.id)}
 if(before.length!==catalog.length-ids.length)throw Error('Unexpected existing catalog count')
 const preflight=JSON.parse(readFileSync('artifacts/harbor-expansion-preflight.json','utf8'))
 if(preflight.projectRef!==project)throw Error('Preflight project mismatch')
 const current=await query(functionQuery)
 for(const f of preflight.functions)if(!current.some(r=>canonical(r)===canonical(f)))throw Error('Function drift since preflight: '+f.name)
 const sql=['begin;',"set local lock_timeout='5s';",'lock table public.harbor_voyages in share row exclusive mode;','lock table public.harbor_vessels in share row exclusive mode;',
 'create temporary table harbor_preserved_trips on commit drop as select id,vessel_snapshot,region_id,departed_at,returns_at from public.harbor_voyages where claimed_at is null;']
 for(const f of preflight.functions){const md5=createHash('md5').update(f.definition).digest('hex');sql.push(`do $$begin if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=${quote(f.schema)} and p.proname=${quote(f.name)} and md5(pg_get_functiondef(p.oid))=${quote(md5)}) then raise exception 'HARBOR_FUNCTION_DRIFT';end if;end$$;`)}
 for(const file of files){
  const source=readFileSync('supabase/migrations/'+file,'utf8').replaceAll('\r\n','\n')
  sql.push(source.split('\n').filter(line=>!/^\s*(begin|commit);\s*$/i.test(line)).join('\n'))
  sql.push(`insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},array[${quote(source)}]);`)
 }
 sql.push("do $$begin if exists(select 1 from harbor_preserved_trips b left join public.harbor_voyages a on a.id=b.id where a.id is null or (a.vessel_snapshot,a.region_id,a.departed_at,a.returns_at) is distinct from (b.vessel_snapshot,b.region_id,b.departed_at,b.returns_at)) then raise exception 'EXISTING_TRIP_CHANGED';end if;end$$;",'commit;')
 await query(sql.join('\n'),false)
 console.log('Applied only the two new migrations atomically; existing voyage snapshots preserved.')
}
if(mode==='deploy'||mode==='verify'){
 const images=await verifyImages(),rows=await query('select * from public.harbor_vessels order by id')
 if(canonical(rows)!==canonical(catalog))throw Error('Remote vessel catalog differs')
 const functions=await query(functionQuery),local=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure.functions
 for(const f of functions)if(!local.some(l=>l.schema===f.schema&&l.name===f.name&&l.definition===f.definition))throw Error('Final function mismatch '+f.name)
 const migrations=await query(`select version,name from supabase_migrations.schema_migrations where version in (${files.map(f=>quote(f.slice(0,14))).join(',')}) order by version`)
 if(migrations.length!==2)throw Error('Missing new migration records')
 const grants=await query("select has_function_privilege('anon','public.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text,text)','execute') as anon,has_function_privilege('authenticated','public.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text,text)','execute') as authenticated")
 if(grants[0].anon||!grants[0].authenticated)throw Error('RPC grants mismatch')
 writeFileSync(root+'/remote-verification.json',JSON.stringify({projectRef:project,verifiedAt:new Date().toISOString(),scope:'24 boat catalog rows, five relevant function definitions, new RPC execute grants, two new migration records and 11 public image hashes; not full remote structure parity or production frontend deployment',migrations,images,newVessels:rows.filter(r=>ids.includes(r.id))},null,2)+'\n')
 console.log('Verified 24 boat rows, 5 functions, RPC grants, 2 migrations and 11 public image hashes.')
}
if(!['deploy','verify','smoke'].includes(mode))throw Error('Usage: node scripts/db/harbor-expansion-remote.mjs deploy|verify|smoke')
