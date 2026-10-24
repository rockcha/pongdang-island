import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash,randomUUID} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',file='20261024023016_aquarium_tank_display_order.sql'
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Wrong project')
const quote=s=>"'"+s.replaceAll("'","''")+"'",normalize=s=>s.replaceAll('\r\n','\n')
async function query(sql,readOnly=true){const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql,read_only:readOnly})});if(!response.ok){const error=await response.json();throw Error('Remote SQL HTTP '+response.status+': '+String(error.message??'failed').slice(0,400))}return response.json()}
const mode=process.argv[2]
if(mode==='deploy'){
 const preflight=JSON.parse(readFileSync('artifacts/aquarium-order-preflight.json','utf8'))
 if(preflight.projectRef!==project)throw Error('Wrong preflight project')
 const guards=preflight.functions.map(f=>`if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=${quote(f.schema)} and p.proname=${quote(f.name)} and md5(pg_get_functiondef(p.oid))=${quote(createHash('md5').update(f.definition).digest('hex'))}) then raise exception 'AQUARIUM_FUNCTION_DRIFT';end if;`).join('\n')
 const source=readFileSync('supabase/migrations/'+file,'utf8'),body=source.split('\n').filter(l=>!/^\s*(begin|commit);\s*$/i.test(l)).join('\n')
 await query(`begin;set local lock_timeout='5s';lock table public.aquarium_tanks in share row exclusive mode;
 do $$begin ${guards} end$$;
 create temporary table preserved_aquarium_tanks on commit drop as select * from public.aquarium_tanks;
 ${body}
 do $$begin if exists(select 1 from preserved_aquarium_tanks b left join public.aquarium_tanks a on a.id=b.id where a.id is null or (a.user_id,a.name,a.background_id,a.is_default,a.created_at) is distinct from (b.user_id,b.name,b.background_id,b.is_default,b.created_at)) then raise exception 'TANK_METADATA_CHANGED';end if;end$$;
 insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},array[${quote(source)}]);commit;`,false)
 console.log('Applied one new migration; existing tank identities and metadata preserved.')
}
if(mode==='deploy'||mode==='verify'){
 const rows=await query("select n.nspname as schema,p.proname as name,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='app_private' and p.proname in ('aquarium_state','buy_aquarium_tank','friend_aquarium','reorder_aquarium_tanks')) or (n.nspname='public' and p.proname='reorder_aquarium_tanks')")
 const local=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure.functions
 if(rows.length!==5)throw Error('Missing functions')
 for(const f of rows)if(!local.some(l=>l.schema===f.schema&&l.name===f.name&&normalize(l.definition)===normalize(f.definition)))throw Error('Function mismatch '+f.name)
 const [grants]=await query("select has_function_privilege('anon','public.reorder_aquarium_tanks(uuid[],uuid[])','execute') as anon,has_function_privilege('authenticated','public.reorder_aquarium_tanks(uuid[],uuid[])','execute') as authenticated,not exists(select 1 from public.aquarium_tanks group by user_id,display_order having count(*)>1) as distinct_positions")
 if(grants.anon||!grants.authenticated||!grants.distinct_positions)throw Error('Grants or position verification failed')
 const history=await query(`select version from supabase_migrations.schema_migrations where version=${quote(file.slice(0,14))}`)
 if(history.length!==1)throw Error('Missing migration history')
 writeFileSync('artifacts/aquarium-order-remote-verification.json',JSON.stringify({projectRef:project,verifiedAt:new Date().toISOString(),scope:'Five aquarium functions, reorder RPC grants, unique per-owner display positions and this migration record; not full schema parity or frontend deployment',grants,history},null,2)+'\n')
 console.log('Verified five functions, authenticated-only RPC, display positions and migration history.')
}
if(mode==='smoke'){
 const owner=randomUUID(),friend=randomUUID()
 const results=await query(`begin;
 insert into auth.users(id,email) values(${quote(owner)},${quote('tank-owner-'+owner+'@example.invalid')}),(${quote(friend)},${quote('tank-friend-'+friend+'@example.invalid')});
 insert into public.player_profiles(id,nickname) values(${quote(owner)},${quote('어항검증'+owner.slice(0,6))}),(${quote(friend)},${quote('친구검증'+friend.slice(0,6))}) on conflict(id) do nothing;
 insert into public.player_wallets(user_id,gold) values(${quote(owner)},10000) on conflict(user_id) do update set gold=10000;
 insert into public.friend_requests(sender_id,recipient_id,status) values(${quote(owner)},${quote(friend)},'accepted');
 select set_config('request.jwt.claim.sub',${quote(owner)},true);
 set local role authenticated;
 do $$declare s jsonb;ids uuid[];next uuid[];r jsonb;begin
 s:=public.aquarium_state();
 for i in 1..4 loop perform public.buy_aquarium_tank(gen_random_uuid());end loop;
 s:=public.aquarium_state();select array_agg((x.value->>'id')::uuid order by x.position) into ids from jsonb_array_elements(s->'tanks') with ordinality x(value,position);
 next:=array[ids[5],ids[1],ids[2],ids[3],ids[4]];
 r:=public.reorder_aquarium_tanks(next,ids);
 if r->'tanks'->0->>'id'<>ids[5]::text then raise exception 'REPRESENTATIVE_ORDER_FAILURE';end if;
 perform public.reorder_aquarium_tanks(next,ids);
 perform set_config('harbor.test.expected_tank',ids[5]::text,true);
 end$$;
 reset role;
 select set_config('request.jwt.claim.sub',${quote(friend)},true);
 set local role authenticated;
 do $$begin if public.friend_aquarium(${quote(owner)}) ->'tanks'->0->>'id'<>current_setting('harbor.test.expected_tank') then raise exception 'FRIEND_REPRESENTATIVE_FAILURE';end if;end$$;
 reset role;rollback;
 select not exists(select 1 from auth.users where id in (${quote(owner)},${quote(friend)})) as rolled_back;`,false)
 if(!results.some(r=>r.rolled_back===true))throw Error('Rollback verification failed')
 console.log('Authenticated five-tank reorder, retry and friend representative passed; all temporary accounts and data rolled back.')
}
if(!['deploy','verify','smoke'].includes(mode))throw Error('Usage: deploy|verify|smoke')
