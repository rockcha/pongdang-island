import {readFileSync,writeFileSync} from 'node:fs'
const path='supabase/migrations/20261017082326_cloudferry_region_catalog.sql'
const generated=readFileSync(path,'utf8'),c=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
if(!generated.startsWith('-- Generated from supabase/catalog/'))throw Error('Review only a fresh db:catalog output')
const lit=x=>x===null?'null':typeof x==='number'||typeof x==='boolean'?String(x):`'${String(x).replaceAll("'","''")}'`
function upsert(table,row,key='id'){const cols=Object.keys(row);return `insert into public.${table} (${cols.join(',')}) values (${cols.map(k=>lit(row[k])).join(',')})\non conflict(${key}) do update set ${cols.filter(k=>k!==key).map(k=>`${k}=excluded.${k}`).join(',')};`}
const region=c.regions.find(r=>r.id==='cloudferry'),map=c.region_maps.find(r=>r.region_id==='cloudferry')
const ids=c.collectible_habitats.filter(h=>h.region_id==='cloudferry').map(h=>lit(h.species_id))
const sql=[
'-- Reviewed catalog diff: add Cloud Ferry route, map, rod and shared habitats only. Safe to rerun.',
'begin;',upsert('regions',region),upsert('region_maps',map,'region_id'),
upsert('fishing_rods',{id:'cloudferry',name:'구름나루 바람 낚싯대',price:1500,region_id:'cloudferry',failure_reduction_bp:200,native_bonus_bp:200}),
`-- Respect remote-native differences: never import another region's exclusive species.\ninsert into public.collectible_habitats(species_id,region_id)\nselect id,'cloudferry' from public.collectible_species where id in (${ids.join(',')}) and native_region_id is null and kind<>'map'\non conflict do nothing;`,
readFileSync('artifacts/cloudferry-odds.sql','utf8'),
"notify pgrst,'reload schema';",'commit;',''].join('\n')
writeFileSync(path,sql);writeFileSync('artifacts/cloudferry-install.sql',sql)
