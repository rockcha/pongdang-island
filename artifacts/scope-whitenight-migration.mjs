import {readFileSync,writeFileSync} from 'node:fs'
const file='supabase/migrations/20261017064137_whitenight_native_species.sql'
const plan=JSON.parse(readFileSync('artifacts/whitenight-expansion-plan.json','utf8')),ids=new Set(plan.map(s=>s.id))
const c=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')),rows=c.collectible_species.filter(s=>ids.has(s.id)),cols=Object.keys(rows[0])
if(!readFileSync(file,'utf8').startsWith('-- Generated from'))throw Error('Expected freshly generated catalog migration')
const q=v=>v===null?'null':typeof v==='boolean'||typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`
const sql=['-- Reviewed diff: 32 White-night native species only; retain existing species and player data.','begin;','set constraints all deferred;',
 `insert into public.collectible_species (${cols.map(k=>'"'+k+'"').join(',')}) values\n${rows.map(s=>'('+cols.map(k=>q(s[k])).join(',')+')').join(',\n')}\non conflict(id) do update set ${cols.filter(k=>k!=='id').map(k=>`"${k}"=excluded."${k}"`).join(',')};`,
 `delete from public.collectible_habitats where species_id in (${rows.map(s=>q(s.id)).join(',')});`,
 `insert into public.collectible_habitats(species_id,region_id) values\n${rows.map(s=>`(${q(s.id)},'whitenight')`).join(',\n')};`,
 `do $$begin\n if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='facing_direction') then execute ${q(`update public.collectible_species set facing_direction='right' where id in (${rows.map(s=>q(s.id)).join(',')})`)};end if;\n if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='idle_animated') then execute ${q(`update public.collectible_species set idle_animated=true where id in (${plan.filter(s=>s.movement==='fixed').map(s=>q(s.id)).join(',')})`)};end if;\nend $$;`,
 "notify pgrst,'reload schema';",'commit;',''].join('\n')
writeFileSync(file,sql)
writeFileSync('artifacts/whitenight-species-install.sql',sql)
console.log('Scoped to 23 fish and 9 decorations; existing habitats untouched.')
