import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',version='20261029145300',name='lower_mythic_relic_prices_200'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const targets=catalog.fishing_relics.filter(r=>r.rarity==='mythic')
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
const quote=s=>"'"+s.replaceAll("'","''")+"'"
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const rowsSql='select id,rarity,sell_price,enabled from public.fishing_relics order by id'
const before=await query(rowsSql),mythics=before.filter(r=>r.rarity==='mythic')
if(mythics.length!==targets.length||targets.length!==11||targets.some(r=>r.sell_price!==2800||!mythics.some(m=>m.id===r.id&&m.sell_price===3000)))throw Error('Mythic price drift')
const [history]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied`)
if(history.applied)throw Error('Already applied')
if(process.argv[2]!=='apply'){console.log(JSON.stringify({project,migration:version,count:targets.length,preflight:true}));process.exit(0)}
const body=sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')
const guard=`select count(*)=11 and bool_and(sell_price=3000) and array_agg(id order by id)=array[${targets.map(r=>r.id).sort().map(quote).join(',')}]::text[] from public.fishing_relics where rarity='mythic'`
await query(`begin;set local statement_timeout='30s';lock table public.fishing_relics in share row exclusive mode;do $$begin if not (${guard}) then raise exception 'PRICE_DRIFT';end if;end$$;\n${body}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const after=await query(rowsSql)
if(after.length!==before.length||after.some((r,i)=>JSON.stringify(r)!==JSON.stringify({...before[i],sell_price:r.rarity==='mythic'?2800:before[i].sell_price})))throw Error('Post-deploy price mismatch')
const [applied]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied`)
if(!applied.applied)throw Error('Missing migration history')
console.log(JSON.stringify({project,migration:version,verified:true,count:targets.length,oldPrice:3000,newPrice:2800,otherRelicsUnchanged:true,capturedAt:new Date().toISOString()}))
