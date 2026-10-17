import {readFileSync,writeFileSync} from 'node:fs'
const c=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const lit=x=>x===null?'null':typeof x==='boolean'||typeof x==='number'?String(x):`'${String(x).replaceAll("'","''")}'`
function upsert(table,rows,key='id'){
 const cols=Object.keys(rows[0]);return `insert into public.${table} (${cols.join(',')}) values\n${rows.map(r=>`(${cols.map(k=>lit(r[k])).join(',')})`).join(',\n')}\non conflict(${key}) do update set ${cols.filter(k=>k!==key).map(k=>`${k}=excluded.${k}`).join(',')};`
}
const rod={id:'whitenight',name:'백야 서리 낚싯대',price:1500,region_id:'whitenight',failure_reduction_bp:200,native_bonus_bp:200}
const sql=[
 '-- Reviewed catalog diff: add White-night route, map product, rod and shared habitats only.',
 'begin;',
 upsert('regions',c.regions.filter(r=>r.id==='whitenight')),
 upsert('region_maps',c.region_maps.filter(r=>r.region_id==='whitenight'),'region_id'),
 upsert('fishing_rods',[rod]),
 `insert into public.collectible_habitats(species_id,region_id) values\n${c.collectible_habitats.filter(h=>h.region_id==='whitenight').map(h=>`(${lit(h.species_id)},'whitenight')`).join(',\n')}\non conflict do nothing;`,
 readFileSync('artifacts/whitenight-odds.sql','utf8'),
 "notify pgrst,'reload schema';",'commit;',''
].join('\n')
writeFileSync('supabase/migrations/20261017060959_whitenight_region_catalog.sql',sql)
writeFileSync('artifacts/whitenight-install.sql',sql)
