import fs from 'node:fs'
import {query,project} from './pharaoh-remote.mjs'
const version='20261030015338',name='pharaoh_colossus_fixed',prior=JSON.parse(fs.readFileSync('.cache/colossus-fixed-preflight.json','utf8')),expected=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).collectible_species.find(s=>s.id==='pharaoh-obelisk-colossus'),sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n'),quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n').trim(),read="select * from public.collectible_species where id='pharaoh-obelisk-colossus'"
if(prior.project!==project||expected.movement_type!=='fixed'||Object.entries(expected).some(([k,v])=>k!=='movement_type'&&String(v)!==String(prior.species[k])))throw Error('Unexpected catalog scope')
const history=await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`)
if(history.length&&!history[0].statements.some(s=>norm(s)===norm(sql)))throw Error('Migration history differs')
if(!history.length){const rows=await query(read);if(rows.length!==1||Object.entries(prior.species).some(([k,v])=>String(v)!==String(rows[0][k])))throw Error('Remote catalog changed since preflight')}
if(process.argv[2]==='apply'&&!history.length)await query('begin;'+sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const rows=await query(read),verified=rows.length===1&&Object.entries(expected).every(([k,v])=>String(v)===String(rows[0][k]))
if(!verified)throw Error('Post-deploy mismatch')
await query("begin read only;set local role authenticated;do $verify$ begin if not exists(select 1 from public.collectible_species where id='pharaoh-obelisk-colossus' and movement_type='fixed') then raise exception 'Fixed catalog read failed';end if;end $verify$;rollback;",false)
console.log(JSON.stringify({project,id:rows[0].id,movement:rows[0].movement_type,verified}))
