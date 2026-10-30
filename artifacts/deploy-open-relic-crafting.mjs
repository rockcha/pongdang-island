import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash,randomUUID} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',version='20261029155437',name='open_relic_crafting_to_all_players'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const expected={craft_relic:'12c84dbc8ff08f6a87f8bdd8baaf905f',relic_state:'48803cc277e6545ee18f1f248ed1cda1'}
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
const quote=s=>"'"+s.replaceAll("'","''")+"'"
async function query(query,read_only=true){
 const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!response.ok)throw Error('Management HTTP '+response.status)
 return response.json()
}
const stateSql="select p.proname name,md5(replace(pg_get_functiondef(p.oid),E'\\r\\n',E'\\n')) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in ('craft_relic','relic_state')"
const before=await query(stateSql)
const [history]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied`)
if(process.argv[2]!=='verify'){
if(before.length!==2||before.some(f=>expected[f.name]!==f.hash))throw Error('Function drift')
if(history.applied)throw Error('Already applied')
if(process.argv[2]!=='apply'){console.log(JSON.stringify({project,migration:version,preflight:true}));process.exit(0)}
const guard=Object.entries(expected).map(([n,h])=>`if (select hash from (${stateSql}) f where name=${quote(n)}) is distinct from ${quote(h)} then raise exception 'FUNCTION_DRIFT';end if;`).join('\n')
await query(`begin;set local statement_timeout='30s';do $$begin ${guard} end$$;\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
}
const after=await query(stateSql),snapshot=JSON.parse(fs.readFileSync('docs/db/local-schema.json','utf8')).structure
for(const f of after){const local=snapshot.functions.find(x=>x.schema==='app_private'&&x.name===f.name);if(createHash('md5').update(local.definition.replaceAll('\r\n','\n')).digest('hex')!==f.hash)throw Error('Post-deploy mismatch')}
const [permissions]=await query("select has_function_privilege('anon','public.craft_relic(text,text,uuid)','execute') anon,has_function_privilege('authenticated','public.craft_relic(text,text,uuid)','execute') authenticated,position('OPERATOR_REQUIRED' in pg_get_functiondef('app_private.craft_relic(text,text,uuid)'::regprocedure))=0 operator_gate_removed")
if(permissions.anon||!permissions.authenticated||!permissions.operator_gate_removed)throw Error('Permission mismatch')
const probe=randomUUID()
const [probeResult]=await query(`select exists(select 1 from auth.users where id=${quote(probe)}::uuid) exists`)
if(probeResult.exists)throw Error('Probe collided with real account')
// Read the state with an empty synthetic authenticated scope; do not create or spend player data.
await query(`begin read only;set local role authenticated;select set_config('request.jwt.claim.sub',${quote(probe)},true);do $$begin if (public.relic_state()->>'canCraft')::boolean is distinct from true then raise exception 'NONOPERATOR_STATE_BLOCKED';end if;end$$;rollback;`,false)
const [applied]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied`)
if(!applied.applied)throw Error('Missing migration history')
console.log(JSON.stringify({project,migration:version,verified:true,permissions,nonoperatorState:true,capturedAt:new Date().toISOString()}))
